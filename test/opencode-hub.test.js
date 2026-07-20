const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { createOpencodeHub } = require("../src/opencode-hub");

class FakeWs {
  constructor() { this.sent = []; this.handlers = {}; this.closed = null; }
  send(value) { this.sent.push(JSON.parse(value)); }
  close(code) { this.closed = code; this.handlers.close?.(); }
  on(name, handler) { this.handlers[name] = handler; }
  message(value) { return this.handlers.message(value); }
}
function store() {
  const machines = []; const sessions = [];
  return { listOpencodeMachines: async () => machines, addOpencodeMachine: async value => { const machine = { id: "machine", revoked: false, lastSeen: null, createdAt: "now", ...value }; machines.push(machine); return machine; }, updateOpencodeMachine: async (id, value) => { const item = machines.find(machine => machine.id === id); return item && Object.assign(item, value); }, findOpencodeMachineByTokenHash: async hash => machines.find(machine => machine.tokenHash === hash) || null, listOpencodeSessions: async () => sessions, upsertOpencodeSession: async value => { const index = sessions.findIndex(item => item.id === value.id && item.machineId === value.machineId); if (index < 0) sessions.push(value); else sessions[index] = value; return value; } };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
test("OpenCode hello validates token and snapshots persist", async () => {
  const data = store(); const hub = createOpencodeHub({ store: data }); const bad = new FakeWs(); await hub.handleAgentSocket(bad); await bad.message(JSON.stringify({ type: "hello", token: "bad" })); assert.equal(bad.closed, 4001);
  await data.addOpencodeMachine({ name: "Laptop", tokenHash: crypto.createHash("sha256").update("good").digest("hex") }); const agent = new FakeWs(); await hub.handleAgentSocket(agent); await agent.message(JSON.stringify({ type: "hello", token: "good", sessions: [] })); assert.deepEqual(agent.sent[0], { type: "hello-ok", machineId: "machine" }); await agent.message(JSON.stringify({ type: "snapshot", sessionID: "s", title: "Session", directory: "/tmp", messages: [{ info: {}, parts: [] }] })); await tick(); assert.equal((await data.listOpencodeSessions())[0].id, "s");
});
test("events and prompts relay and revoked machines are rejected", async () => {
  const data = store(); const tokenHash = crypto.createHash("sha256").update("good").digest("hex"); await data.addOpencodeMachine({ name: "Laptop", tokenHash }); const hub = createOpencodeHub({ store: data }); const agent = new FakeWs(); await hub.handleAgentSocket(agent); await agent.message(JSON.stringify({ type: "hello", token: "good", sessions: [{ id: "s" }] })); const ui = new FakeWs(); await hub.handleUiSocket(ui, { id: "user" }); await ui.message(JSON.stringify({ type: "subscribe", machineId: "machine", sessionID: "s" })); await agent.message(JSON.stringify({ type: "event", sessionID: "s", seq: 1, event: { type: "message.updated" } })); assert.equal(ui.sent.at(-1).type, "event"); await ui.message(JSON.stringify({ type: "prompt", machineId: "machine", sessionID: "s", text: "hi", requestID: "r" })); assert.deepEqual(agent.sent.at(-1), { type: "prompt", sessionID: "s", text: "hi", requestID: "r" }); await data.updateOpencodeMachine("machine", { revoked: true }); const rejected = new FakeWs(); await hub.handleAgentSocket(rejected); await rejected.message(JSON.stringify({ type: "hello", token: "good" })); assert.equal(rejected.closed, 4001);
});
