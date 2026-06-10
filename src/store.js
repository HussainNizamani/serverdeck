const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function randomSecret() {
  return crypto.randomBytes(24).toString("hex");
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map(tag => String(tag).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map(tag => tag.trim()).filter(Boolean);
  }
  return [];
}

function normalizeBubbleLabel(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase()
    .slice(0, 3);
}

function normalizeGroupName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 48);
}

function normalizeFilePath(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed.replace(/^(['"])(.*)\1$/, "$2").trim();
}

function normalizeServerInput(input = {}, previous = {}) {
  const name = String(input.name ?? previous.name ?? "").trim();
  const host = String(input.host ?? previous.host ?? "").trim();
  const user = String(input.user ?? previous.user ?? "root").trim();
  const port = Number(input.port ?? previous.port ?? 22);
  const keyPath = normalizeFilePath(input.keyPath ?? previous.keyPath ?? "");
  const bubbleLabel = normalizeBubbleLabel(input.bubbleLabel ?? previous.bubbleLabel ?? "");
  const groupId = String(input.groupId ?? previous.groupId ?? "").trim();
  const notes = String(input.notes ?? previous.notes ?? "");
  const tags = normalizeTags(input.tags ?? previous.tags ?? []);

  if (!host) {
    const err = new Error("Host is required");
    err.statusCode = 400;
    throw err;
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    const err = new Error("Port must be between 1 and 65535");
    err.statusCode = 400;
    throw err;
  }

  return {
    name: name || host,
    host,
    user,
    port,
    keyPath,
    bubbleLabel,
    groupId,
    tags,
    notes
  };
}

function createEmptyState() {
  return {
    version: 3,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    groups: [],
    servers: [],
    settings: {}
  };
}

function normalizeServerRecord(server) {
  const taskHistory = Array.isArray(server.taskHistory) ? server.taskHistory : [];
  return {
    ...server,
    reportHistory: Array.isArray(server.reportHistory) ? server.reportHistory : [],
    taskHistory
  };
}

function trimTaskHistory(history) {
  const counts = new Map();
  const kept = [];
  for (const entry of history) {
    const key = entry.task || "unknown";
    const count = counts.get(key) || 0;
    if (count >= 50) continue;
    counts.set(key, count + 1);
    kept.push(entry);
    if (kept.length >= 500) break;
  }
  return kept;
}

function createStore(filePath) {
  let state = createEmptyState();

  function save() {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    state.updatedAt = nowIso();
    const tempPath = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(state, null, 2));
    fs.renameSync(tempPath, filePath);
  }

  function load() {
    if (!fs.existsSync(filePath)) {
      save();
      return clone(state);
    }
    const raw = fs.readFileSync(filePath, "utf8");
    state = { ...createEmptyState(), ...JSON.parse(raw) };
    state.groups = Array.isArray(state.groups) ? state.groups : [];
    state.servers = Array.isArray(state.servers) ? state.servers.map(normalizeServerRecord) : [];
    state.settings = state.settings && typeof state.settings === "object" ? state.settings : {};
    save();
    return clone(state);
  }

  function assertGroupExists(groupId) {
    if (!groupId) return;
    if (!state.groups.some(group => group.id === groupId)) {
      const err = new Error("Group not found");
      err.statusCode = 400;
      throw err;
    }
  }

  function listGroups() {
    return clone(state.groups);
  }

  function createGroup(input = {}) {
    const name = normalizeGroupName(input.name);
    if (!name) {
      const err = new Error("Group name is required");
      err.statusCode = 400;
      throw err;
    }
    if (state.groups.some(group => group.name.toLowerCase() === name.toLowerCase())) {
      const err = new Error("Group already exists");
      err.statusCode = 409;
      throw err;
    }
    const createdAt = nowIso();
    const group = {
      id: crypto.randomUUID(),
      name,
      createdAt,
      updatedAt: createdAt
    };
    state.groups.push(group);
    save();
    return clone(group);
  }

  function updateGroup(id, input = {}) {
    const index = state.groups.findIndex(group => group.id === id);
    if (index === -1) return null;
    const name = normalizeGroupName(input.name);
    if (!name) {
      const err = new Error("Group name is required");
      err.statusCode = 400;
      throw err;
    }
    if (state.groups.some(group => group.id !== id && group.name.toLowerCase() === name.toLowerCase())) {
      const err = new Error("Group already exists");
      err.statusCode = 409;
      throw err;
    }
    state.groups[index] = {
      ...state.groups[index],
      name,
      updatedAt: nowIso()
    };
    save();
    return clone(state.groups[index]);
  }

  function deleteGroup(id) {
    const index = state.groups.findIndex(group => group.id === id);
    if (index === -1) return false;
    state.groups.splice(index, 1);
    state.servers = state.servers.map(server => server.groupId === id ? { ...server, groupId: "", updatedAt: nowIso() } : server);
    save();
    return true;
  }

  function listServers() {
    return clone(state.servers);
  }

  function getServer(id) {
    const server = state.servers.find(item => item.id === id);
    return server ? clone(server) : null;
  }

  function createServer(input) {
    const normalized = normalizeServerInput(input);
    assertGroupExists(normalized.groupId);
    const createdAt = nowIso();
    const server = {
      id: crypto.randomUUID(),
      ...normalized,
      agentToken: randomSecret(),
      lastReport: null,
      reportHistory: [],
      taskHistory: [],
      createdAt,
      updatedAt: createdAt
    };
    state.servers.push(server);
    save();
    return clone(server);
  }

  function updateServer(id, input) {
    const index = state.servers.findIndex(item => item.id === id);
    if (index === -1) {
      return null;
    }
    const previous = state.servers[index];
    const normalized = normalizeServerInput(input, previous);
    assertGroupExists(normalized.groupId);
    state.servers[index] = {
      ...previous,
      ...normalized,
      updatedAt: nowIso()
    };
    save();
    return clone(state.servers[index]);
  }

  function deleteServer(id) {
    const index = state.servers.findIndex(item => item.id === id);
    if (index === -1) {
      return false;
    }
    state.servers.splice(index, 1);
    save();
    return true;
  }

  function recordReport(serverId, report) {
    const index = state.servers.findIndex(item => item.id === serverId);
    if (index === -1) {
      return null;
    }
    const receivedAt = nowIso();
    const storedReport = {
      id: crypto.randomUUID(),
      receivedAt,
      source: "agent",
      payload: report
    };
    const history = [storedReport, ...(state.servers[index].reportHistory || [])].slice(0, 72);
    state.servers[index] = {
      ...state.servers[index],
      lastReport: storedReport,
      reportHistory: history,
      updatedAt: receivedAt
    };
    save();
    return clone(storedReport);
  }

  function recordTaskRun(serverId, run) {
    const index = state.servers.findIndex(item => item.id === serverId);
    if (index === -1) {
      return null;
    }
    const refreshedAt = nowIso();
    const storedRun = {
      id: crypto.randomUUID(),
      task: String(run.task || "overview"),
      actionTask: String(run.actionTask || run.task || "overview"),
      input: run.input || {},
      refreshedAt,
      status: run.status || "ok",
      exitCode: run.exitCode ?? null,
      signal: run.signal ?? null,
      durationMs: Number(run.durationMs || 0),
      timedOut: Boolean(run.timedOut),
      stdout: String(run.stdout || ""),
      stderr: String(run.stderr || "")
    };
    const history = trimTaskHistory([storedRun, ...(state.servers[index].taskHistory || [])]);
    state.servers[index] = {
      ...state.servers[index],
      taskHistory: history,
      updatedAt: refreshedAt
    };
    save();
    return clone(storedRun);
  }

  function listTaskHistory(serverId, task) {
    const server = state.servers.find(item => item.id === serverId);
    if (!server) return null;
    const history = server.taskHistory || [];
    const filtered = task ? history.filter(entry => entry.task === task) : history;
    return clone(filtered);
  }

  function getSetting(key) {
    const value = state.settings?.[key];
    return value === undefined ? null : clone(value);
  }

  function setSetting(key, value) {
    state.settings = state.settings && typeof state.settings === "object" ? state.settings : {};
    state.settings[key] = clone(value);
    save();
    return clone(value);
  }

  return {
    load,
    getSetting,
    setSetting,
    listGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    listServers,
    getServer,
    createServer,
    updateServer,
    deleteServer,
    recordReport,
    recordTaskRun,
    listTaskHistory
  };
}

module.exports = {
  createStore,
  normalizeBubbleLabel,
  normalizeFilePath,
  normalizeGroupName,
  normalizeTags,
  normalizeServerInput
};
