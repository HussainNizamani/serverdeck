const crypto = require("node:crypto");

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function parseMessage(raw) {
  try { return JSON.parse(Buffer.isBuffer(raw) ? raw.toString("utf8") : raw); } catch { return null; }
}

function bind(ws, event, handler) {
  if (typeof ws.on === "function") ws.on(event, handler);
  else if (event === "message" && typeof ws.onMessage === "function") ws.onMessage(handler);
  else if (event === "close" && typeof ws.onClose === "function") ws.onClose(handler);
}

function send(ws, value) {
  try { ws.send(JSON.stringify(value)); } catch { /* socket is gone */ }
}

function createOpencodeHub({ store }) {
  const agents = new Map();
  const clients = new Set();
  const sequences = new Map();

  async function state() {
    const [machines, saved] = await Promise.all([store.listOpencodeMachines(), store.listOpencodeSessions()]);
    return {
      type: "state",
      machines: machines.filter(machine => !machine.revoked).map(machine => {
        const agent = agents.get(machine.id);
        const live = agent ? [...agent.sessions.values()] : [];
        const sessions = new Map(saved.filter(session => session.machineId === machine.id).map(session => [session.id, {
          id: session.id, title: session.title, directory: session.directory, updatedAt: session.updatedAt, online: false
        }]));
        for (const session of live) sessions.set(session.id, { ...sessions.get(session.id), ...session, online: true });
        return { id: machine.id, name: machine.name, online: Boolean(agent), lastSeen: machine.lastSeen, sessions: [...sessions.values()] };
      })
    };
  }

  async function broadcastState() {
    const message = await state();
    for (const client of clients) send(client.ws, message);
  }

  function broadcastSubscribed(machineId, sessionID, message) {
    for (const client of clients) {
      if (client.subscribed?.machineId === machineId && client.subscribed?.sessionID === sessionID) send(client.ws, message);
    }
  }

  async function handleAgentSocket(ws) {
    let machineId = null;
    let missedPongs = 0;
    const heartbeat = setInterval(() => {
      if (!machineId) return;
      if (missedPongs >= 2) return ws.close(4000);
      missedPongs += 1;
      send(ws, { type: "ping" });
    }, 30000);

    bind(ws, "message", async raw => {
      const message = parseMessage(raw);
      if (!message) return;
      if (!machineId) {
        if (message.type !== "hello") return ws.close(4001);
        const machine = await store.findOpencodeMachineByTokenHash(hashToken(message.token));
        if (!machine || machine.revoked) return ws.close(4001);
        machineId = machine.id;
        for (const key of [...sequences.keys()]) {
          if (key.startsWith(`${machineId}:`)) sequences.delete(key);
        }
        const sessions = new Map((Array.isArray(message.sessions) ? message.sessions : []).filter(item => item?.id).map(item => [item.id, {
          id: item.id, title: String(item.title || "Untitled"), directory: String(item.directory || ""), updatedAt: item.updatedAt || new Date().toISOString()
        }]));
        const prior = agents.get(machineId);
        if (prior) prior.ws.close(4000);
        agents.set(machineId, { ws, sessions });
        await store.updateOpencodeMachine(machineId, { lastSeen: new Date().toISOString() });
        send(ws, { type: "hello-ok", machineId });
        await broadcastState();
        return;
      }
      const agent = agents.get(machineId);
      if (!agent || agent.ws !== ws) return;
      if (message.type === "pong") { missedPongs = 0; return; }
      if (message.type === "session-list") {
        agent.sessions = new Map((message.sessions || []).filter(item => item?.id).map(item => [item.id, { ...item, updatedAt: item.updatedAt || new Date().toISOString() }]));
        await broadcastState();
      } else if (message.type === "snapshot" && message.sessionID) {
        const existing = agent.sessions.get(message.sessionID) || { id: message.sessionID };
        agent.sessions.set(message.sessionID, { ...existing, id: message.sessionID, title: message.title || existing.title || "Untitled", directory: message.directory || existing.directory || "", updatedAt: new Date().toISOString() });
        await store.upsertOpencodeSession({ id: message.sessionID, machineId, title: message.title || existing.title || "Untitled", directory: message.directory || existing.directory || "", updatedAt: new Date().toISOString(), snapshot: Array.isArray(message.messages) ? message.messages : [] });
        broadcastSubscribed(machineId, message.sessionID, { type: "snapshot", machineId, sessionID: message.sessionID, messages: Array.isArray(message.messages) ? message.messages : [] });
        await broadcastState();
      } else if (message.type === "event" && message.sessionID) {
        const key = `${machineId}:${message.sessionID}`;
        if (Number.isFinite(message.seq) && message.seq <= (sequences.get(key) ?? -1)) return;
        if (Number.isFinite(message.seq)) sequences.set(key, message.seq);
        if (["session.updated", "message.updated"].includes(message.event?.type)) {
          const session = agent.sessions.get(message.sessionID);
          if (session) { session.updatedAt = new Date().toISOString(); await store.upsertOpencodeSession({ ...session, machineId, snapshot: (await store.listOpencodeSessions()).find(item => item.id === message.sessionID)?.snapshot || [] }); }
        }
        broadcastSubscribed(machineId, message.sessionID, { type: "event", machineId, sessionID: message.sessionID, event: message.event });
      } else if (message.type === "ack") {
        for (const client of clients) send(client.ws, { ...message, machineId });
      }
    });
    bind(ws, "close", async () => {
      clearInterval(heartbeat);
      if (machineId && agents.get(machineId)?.ws === ws) { agents.delete(machineId); await broadcastState(); }
    });
  }

  async function handleUiSocket(ws, session) {
    if (!session) return ws.close(4001);
    const client = { ws, subscribed: null };
    clients.add(client);
    send(ws, await state());
    bind(ws, "message", async raw => {
      const message = parseMessage(raw);
      if (!message) return;
      if (message.type === "subscribe") {
        client.subscribed = { machineId: message.machineId, sessionID: message.sessionID };
        const saved = (await store.listOpencodeSessions()).find(item => item.machineId === message.machineId && item.id === message.sessionID);
        if (saved) send(ws, { type: "snapshot", machineId: message.machineId, sessionID: message.sessionID, messages: saved.snapshot || [] });
        const agent = agents.get(message.machineId);
        if (agent) send(agent.ws, { type: "get-snapshot", sessionID: message.sessionID });
        return;
      }
      if (["prompt", "abort", "permission"].includes(message.type)) {
        const agent = agents.get(message.machineId);
        if (!agent) return send(ws, { type: "error", message: "Machine is offline", requestID: message.requestID });
        const forwarded = { ...message };
        delete forwarded.machineId;
        send(agent.ws, forwarded);
      }
    });
    bind(ws, "close", () => clients.delete(client));
  }

  function disconnectMachine(machineId) { agents.get(machineId)?.ws.close(4000); }
  return { handleAgentSocket, handleUiSocket, disconnectMachine, state, listMachines: () => store.listOpencodeMachines(), listSessions: () => store.listOpencodeSessions() };
}

module.exports = { createOpencodeHub, hashToken };
