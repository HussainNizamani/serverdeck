const OPS = [
  { id: "overview", label: "Overview", meta: "Agent status and SSH checks" },
  { id: "services", label: "Services", meta: "List units and manage one service" },
  { id: "logs", label: "Logs", meta: "Recent system journal or syslog" },
  { id: "storage", label: "Storage", meta: "Filesystems, block devices, and inodes" },
  { id: "network", label: "Network", meta: "Addresses, routes, and listening ports" },
  { id: "processes", label: "Processes", meta: "Top CPU processes" },
  { id: "updates", label: "Updates", meta: "Available package updates" },
  { id: "containers", label: "Containers", meta: "Podman or Docker containers" },
  { id: "users", label: "Users", meta: "Accounts, sessions, and recent logins" },
  { id: "security", label: "Security", meta: "Firewall, SELinux, SSH, and fail2ban" },
  { id: "files", label: "Files", meta: "SFTP file manager: browse, upload, download" },
  { id: "command", label: "Command", meta: "Run a remote shell command" },
  { id: "settings", label: "SSH Settings", meta: "Server connection, group, notes, and agent install" },
  { id: "multiterm", label: "Terminal", meta: "SSH terminals — one or up to 10 side by side, across servers" },
  { id: "panel", label: "Settings", meta: "Panel appearance, account, and authentication" }
];

const NAV_SECTIONS = [
  { label: "Monitor", ids: ["overview", "services", "logs", "processes"] },
  { label: "System", ids: ["storage", "network", "updates", "containers", "users", "security"] },
  { label: "Tools", ids: ["files", "command", "multiterm"] },
  { label: "Manage", ids: ["settings", "panel"] }
];

const OP_ICONS = {
  overview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  services: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  logs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  storage: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
  network: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><path d="M12 8v4m-7 4v-2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/></svg>',
  processes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>',
  updates: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
  containers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  security: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  files: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  command: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
  terminal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  multiterm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
  panel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>'
};

const STORAGE_KEYS = {
  activeOps: "serverDeck.activeOps",
  selectedId: "serverDeck.selectedId",
  theme: "serverDeck.theme",
  accent: "serverDeck.accent",
  navCollapsed: "serverDeck.navCollapsed",
  railCollapsed: "serverDeck.railCollapsed",
  multiLayout: "serverDeck.multiLayout"
};

const ACCENTS = [
  { id: "", label: "Blue", color: "#5b8cff" },
  { id: "violet", label: "Violet", color: "#8b7cf6" },
  { id: "green", label: "Green", color: "#2fbf8f" },
  { id: "orange", label: "Orange", color: "#f59e0b" },
  { id: "rose", label: "Rose", color: "#f0608c" }
];

function readStoredValue(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredValue(key, value) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // Local storage can be disabled; the app still works without persistence.
  }
}

function initialActiveOps() {
  const stored = readStoredValue(STORAGE_KEYS.activeOps);
  return OPS.some(op => op.id === stored) ? stored : "overview";
}

const state = {
  groups: [],
  servers: [],
  selectedId: readStoredValue(STORAGE_KEYS.selectedId),
  draftNew: false,
  addMenuOpen: false,
  groupCreateOpen: false,
  serverRailCollapsed: readStoredValue(STORAGE_KEYS.railCollapsed) === "1",
  featureNavCollapsed: readStoredValue(STORAGE_KEYS.navCollapsed) === "1",
  serverMenuOpenId: null,
  terminals: [],
  activeTerminalId: null,
  config: null,
  sshKeys: [],
  keyUploadDir: "/keys",
  keyHostDir: "/keys",
  draftKeyPaths: [],
  settingsBaseline: null,
  pendingNavigation: null,
  activeOps: initialActiveOps(),
  opsOutputs: {},
  busyKeys: {},
  authStatus: null,
  totpSetup: null,
  sftp: {}
};

const elements = {
  featureNav: document.querySelector(".feature-nav"),
  collapseNavButton: document.querySelector("#collapseNavButton"),
  serverRail: document.querySelector("#serverRail"),
  collapseServerRailButton: document.querySelector("#collapseServerRailButton"),
  newServerButton: document.querySelector("#newServerButton"),
  createMenu: document.querySelector("#createMenu"),
  newServerMenuButton: document.querySelector("#newServerMenuButton"),
  newGroupMenuButton: document.querySelector("#newGroupMenuButton"),
  serverSearch: document.querySelector("#serverSearch"),
  groupCreate: document.querySelector("#groupCreate"),
  groupNameInput: document.querySelector("#groupNameInput"),
  createGroupButton: document.querySelector("#createGroupButton"),
  serverList: document.querySelector("#serverList"),
  railCount: document.querySelector("#railCount"),
  selectedTitle: document.querySelector("#selectedTitle"),
  selectedMeta: document.querySelector("#selectedMeta"),
  openTerminalButton: document.querySelector("#openTerminalButton"),
  deleteServerButton: document.querySelector("#deleteServerButton"),
  saveServerButton: document.querySelector("#saveServerButton"),
  settingsPanel: document.querySelector("#settingsPanel"),
  settingsMeta: document.querySelector("#settingsMeta"),
  contentPane: document.querySelector("#contentPane"),
  serverForm: document.querySelector("#serverForm"),
  serverName: document.querySelector("#serverName"),
  serverHost: document.querySelector("#serverHost"),
  serverUser: document.querySelector("#serverUser"),
  serverPort: document.querySelector("#serverPort"),
  serverBubbleLabel: document.querySelector("#serverBubbleLabel"),
  serverGroup: document.querySelector("#serverGroup"),
  serverPassword: document.querySelector("#serverPassword"),
  serverPasswordClear: document.querySelector("#serverPasswordClear"),
  clearPasswordRow: document.querySelector("#clearPasswordRow"),
  serverTags: document.querySelector("#serverTags"),
  serverNotes: document.querySelector("#serverNotes"),
  metricState: document.querySelector("#metricState"),
  metricLoad: document.querySelector("#metricLoad"),
  metricMemory: document.querySelector("#metricMemory"),
  metricDisk: document.querySelector("#metricDisk"),
  metricOs: document.querySelector("#metricOs"),
  metricLastReport: document.querySelector("#metricLastReport"),
  installCommand: document.querySelector("#installCommand"),
  copyInstallButton: document.querySelector("#copyInstallButton"),
  uploadKeyButton: document.querySelector("#uploadKeyButton"),
  openKeyFolderButton: document.querySelector("#openKeyFolderButton"),
  keyList: document.querySelector("#keyList"),
  keyUploadOverlay: document.querySelector("#keyUploadOverlay"),
  keyFileInput: document.querySelector("#keyFileInput"),
  keyUploadError: document.querySelector("#keyUploadError"),
  keyUploadCancel: document.querySelector("#keyUploadCancel"),
  keyUploadConfirm: document.querySelector("#keyUploadConfirm"),
  unsavedOverlay: document.querySelector("#unsavedOverlay"),
  unsavedSave: document.querySelector("#unsavedSave"),
  unsavedDiscard: document.querySelector("#unsavedDiscard"),
  unsavedCancel: document.querySelector("#unsavedCancel"),
  opsTabs: document.querySelector("#opsTabs"),
  toast: document.querySelector("#toast"),
  authOverlay: document.querySelector("#authOverlay"),
  authTitle: document.querySelector("#authTitle"),
  authSubtitle: document.querySelector("#authSubtitle"),
  authForm: document.querySelector("#authForm"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  authConfirmRow: document.querySelector("#authConfirmRow"),
  authPasswordConfirm: document.querySelector("#authPasswordConfirm"),
  authTotpRow: document.querySelector("#authTotpRow"),
  authTotp: document.querySelector("#authTotp"),
  authSubmit: document.querySelector("#authSubmit"),
  authError: document.querySelector("#authError")
};

function api(path, options = {}) {
  return fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  }).then(async response => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && !path.startsWith("/api/auth/")) {
        state.authStatus = { setupRequired: false, authenticated: false };
        showAuthOverlay("login");
      }
      const error = new Error(body.error || `Request failed with ${response.status}`);
      error.body = body;
      throw error;
    }
    return body;
  });
}

/* ---------- theme ---------- */

function currentTheme() {
  return readStoredValue(STORAGE_KEYS.theme) === "light" ? "light" : "dark";
}

function currentAccent() {
  const stored = readStoredValue(STORAGE_KEYS.accent) || "";
  return ACCENTS.some(accent => accent.id === stored) ? stored : "";
}

function applyTheme(theme, accent) {
  writeStoredValue(STORAGE_KEYS.theme, theme === "light" ? "light" : "");
  writeStoredValue(STORAGE_KEYS.accent, accent || "");
  if (theme === "light") document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
  if (accent) document.documentElement.dataset.accent = accent;
  else delete document.documentElement.dataset.accent;
}

function randomId() {
  // crypto.randomUUID is unavailable in non-secure contexts (plain http over
  // a Tailscale IP on mobile), so fall back to a manual id.
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Clipboard API also requires a secure context; use the legacy fallback.
  const helper = document.createElement("textarea");
  helper.value = text;
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.append(helper);
  helper.select();
  document.execCommand("copy");
  helper.remove();
}

function selectedServer() {
  if (state.draftNew) return null;
  return state.servers.find(server => server.id === state.selectedId) || null;
}

function sortedGroups() {
  return [...state.groups].sort((a, b) => a.name.localeCompare(b.name));
}

function groupNameFor(groupId) {
  return state.groups.find(group => group.id === groupId)?.name || "";
}

function currentOp() {
  return OPS.find(item => item.id === state.activeOps) || OPS[0];
}

function setActiveOps(opId) {
  state.activeOps = OPS.some(op => op.id === opId) ? opId : "overview";
  writeStoredValue(STORAGE_KEYS.activeOps, state.activeOps);
}

function setSelectedId(serverId) {
  state.selectedId = serverId || null;
  writeStoredValue(STORAGE_KEYS.selectedId, state.selectedId);
}

function reportPayload(server) {
  return server?.lastReport?.payload || null;
}

function parseSshMetrics(server) {
  const run = latestTaskRun(server, "overview");
  if (!run?.stdout) return null;
  const match = run.stdout.match(/== Metrics ==\n([\s\S]*?)(\n==|$)/);
  if (!match) return null;
  const metrics = { refreshedAt: run.refreshedAt };
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf("=");
    if (separator > 0) metrics[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return metrics;
}

function healthState(server) {
  const report = server?.lastReport;
  if (report) {
    const ageMs = Date.now() - new Date(report.receivedAt).getTime();
    if (!Number.isNaN(ageMs) && ageMs <= 1000 * 60 * 75) {
      const payload = reportPayload(server);
      if ((payload.failed_services || []).length > 0) return "warn";
      const disk = Array.isArray(payload.disk) ? payload.disk[0] : null;
      if (Number(payload.memory?.used_percent || 0) >= 90 || Number(disk?.used_percent || 0) >= 90) return "warn";
      return "ok";
    }
  }
  const ssh = parseSshMetrics(server);
  if (ssh) {
    if (Number(ssh.failed_services || 0) > 0) return "warn";
    if (Number(ssh.mem_used_percent || 0) >= 90 || Number(ssh.disk_used_percent || 0) >= 90) return "warn";
    return "ok";
  }
  return report ? "stale" : "unknown";
}

function formatRelative(value) {
  if (!value) return "--";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return "--";
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
  const parts = new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).formatToParts(date);
  const part = type => parts.find(item => item.type === type)?.value || "";
  return `${time} ${part("day")} ${part("month")} ${part("year")}`.trim();
}

function taskHistoryFor(server, task) {
  return (server?.taskHistory || [])
    .filter(entry => entry.task === task)
    .sort((a, b) => new Date(b.refreshedAt).getTime() - new Date(a.refreshedAt).getTime());
}

function latestTaskRun(server, task) {
  return taskHistoryFor(server, task)[0] || null;
}

function refreshMeta(server, task) {
  const last = latestTaskRun(server, task);
  return last ? `Last refreshed at ${formatDateTime(last.refreshedAt)}` : "Not refreshed yet";
}

function outputTextFromRun(run) {
  if (!run) return "";
  const chunks = [];
  if (run.stdout) chunks.push(run.stdout);
  if (run.stderr) chunks.push(`[stderr]\n${run.stderr}`);
  chunks.push(`refreshed=${formatDateTime(run.refreshedAt)} exit=${run.exitCode ?? "n/a"} duration=${run.durationMs || 0}ms${run.timedOut ? " timed-out" : ""}`);
  return chunks.join("\n").trim();
}

function panelOutputFor(server, task, fallback) {
  const liveOutput = outputFor(server.id, task);
  if (liveOutput) return liveOutput;
  const storedOutput = outputTextFromRun(latestTaskRun(server, task));
  return storedOutput || fallback;
}

function installCommand(server) {
  if (!server?.id || !server?.agentToken) return "Save the server first.";
  const endpoint = window.location.origin;
  return `curl -fsSL "${endpoint}/agent/install.sh" | sudo sh -s -- "${endpoint}" "${server.id}" "${server.agentToken}"`;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2600);
}

function opsKey(serverId, task) {
  return `${serverId}:${task}`;
}

function outputFor(serverId, task = state.activeOps) {
  return state.opsOutputs[opsKey(serverId, task)] || "";
}

function setOutput(serverId, task, text) {
  state.opsOutputs[opsKey(serverId, task)] = text;
}

function isBusy(serverId, task = state.activeOps) {
  return Boolean(state.busyKeys[opsKey(serverId, task)]);
}

function setBusy(serverId, task, value) {
  const key = opsKey(serverId, task);
  if (value) state.busyKeys[key] = true;
  else delete state.busyKeys[key];
}

function formValue() {
  const payload = {
    name: elements.serverName.value.trim(),
    host: elements.serverHost.value.trim(),
    user: elements.serverUser.value.trim() || "root",
    port: Number(elements.serverPort.value || 22),
    bubbleLabel: elements.serverBubbleLabel.value.trim().replace(/\s+/g, "").toUpperCase().slice(0, 3),
    groupId: elements.serverGroup.value,
    // Selected keys (chosen by ticking them in the SSH keys list) are stored
    // newline-separated in the single keyPath field.
    keyPath: state.draftKeyPaths.join("\n"),
    tags: elements.serverTags.value,
    notes: elements.serverNotes.value
  };
  // Password semantics: omitted = keep saved, "" = clear, value = replace.
  if (elements.serverPasswordClear.checked) {
    payload.password = "";
  } else if (elements.serverPassword.value) {
    payload.password = elements.serverPassword.value;
  }
  return payload;
}

// True when the server-settings form is the active view.
function isSettingsView() {
  return state.activeOps === "settings" || state.draftNew;
}

// A stable fingerprint of every editable settings field, used to detect
// unsaved changes against the baseline captured when the form was loaded.
function settingsSnapshot() {
  return JSON.stringify({
    name: elements.serverName.value,
    host: elements.serverHost.value,
    user: elements.serverUser.value,
    port: elements.serverPort.value,
    bubbleLabel: elements.serverBubbleLabel.value,
    groupId: elements.serverGroup.value,
    tags: elements.serverTags.value,
    notes: elements.serverNotes.value,
    password: elements.serverPassword.value,
    passwordClear: elements.serverPasswordClear.checked,
    keyPaths: [...state.draftKeyPaths].sort()
  });
}

function isSettingsDirty() {
  return isSettingsView() && state.settingsBaseline !== null && settingsSnapshot() !== state.settingsBaseline;
}

// Runs `proceed` unless the settings form has unsaved edits, in which case it
// opens the save/discard/cancel dialog and defers the navigation.
function guardUnsaved(proceed) {
  if (!isSettingsDirty()) {
    proceed();
    return;
  }
  state.pendingNavigation = proceed;
  elements.unsavedOverlay.hidden = false;
}

function closeUnsavedDialog() {
  elements.unsavedOverlay.hidden = true;
  state.pendingNavigation = null;
}

function runPendingNavigation() {
  const proceed = state.pendingNavigation;
  state.pendingNavigation = null;
  elements.unsavedOverlay.hidden = true;
  if (proceed) proceed();
}

// Mirror of src/ssh.js splitKeyPaths: keys are stored newline-separated.
function splitKeyPaths(keyPath) {
  return String(keyPath || "")
    .split("\n")
    .map(entry => entry.trim())
    .filter(Boolean);
}

// Only keys living in the shared upload folder can be deleted from the UI.
function isManagedKey(key) {
  const dir = state.keyUploadDir || "/keys";
  return key.path === `${dir}/${key.name}` || key.path.startsWith(`${dir}/`);
}

function toggleKeySelection(keyPath) {
  const index = state.draftKeyPaths.indexOf(keyPath);
  if (index === -1) state.draftKeyPaths.push(keyPath);
  else state.draftKeyPaths.splice(index, 1);
  renderKeyList();
}

function renderKeyList() {
  if (!elements.keyList) return;
  elements.keyList.innerHTML = "";

  if (!state.sshKeys.length) {
    const empty = document.createElement("li");
    empty.className = "key-list-empty";
    empty.textContent = "No keys yet — upload one or drop it in the shared folder.";
    elements.keyList.append(empty);
    return;
  }

  const canEdit = state.draftNew || Boolean(selectedServer());

  for (const key of state.sshKeys) {
    const selected = state.draftKeyPaths.includes(key.path);
    const item = document.createElement("li");
    item.className = `key-list-item ${selected ? "selected" : ""} ${canEdit ? "selectable" : ""}`;
    item.setAttribute("role", "button");
    item.setAttribute("aria-pressed", selected ? "true" : "false");

    const info = document.createElement("div");
    info.className = "key-list-info";
    const name = document.createElement("span");
    name.className = "key-list-name";
    name.textContent = key.name;
    const meta = document.createElement("span");
    meta.className = "key-list-meta";
    meta.textContent = `${key.type === "ppk" ? "PuTTY" : "OpenSSH"} · ${key.path}`;
    info.append(name, meta);
    item.append(info);

    const right = document.createElement("div");
    right.className = "key-list-right";
    const tick = document.createElement("span");
    tick.className = "key-tick";
    tick.textContent = "✓";
    tick.hidden = !selected;
    tick.title = "Selected for this server";
    right.append(tick);

    if (isManagedKey(key)) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "key-delete";
      remove.textContent = "Delete";
      // Don't let a delete click also toggle the row's selection.
      remove.addEventListener("click", event => {
        event.stopPropagation();
        deleteSshKey(key.name, key.path);
      });
      right.append(remove);
    }
    item.append(right);

    // The whole row toggles selection for this server.
    if (canEdit) {
      item.addEventListener("click", () => toggleKeySelection(key.path));
    }

    elements.keyList.append(item);
  }
}

async function deleteSshKey(name, keyPath) {
  if (!window.confirm(`Delete the key "${name}" from the shared folder? This cannot be undone.`)) {
    return;
  }
  try {
    const response = await api(`/api/ssh-keys/${encodeURIComponent(name)}`, { method: "DELETE" });
    state.sshKeys = response.keys || [];
    state.draftKeyPaths = state.draftKeyPaths.filter(path => path !== keyPath);
    showToast(`Deleted "${name}".`);
    renderKeyList();
  } catch (error) {
    showToast(error.message);
  }
}

// Opens the in-app file browser for the shared keys folder (a "Files session"
// scoped to that one directory — no SSH/FTP needed since the folder is local).
function openKeyFolder() {
  const fm = sftpStateFor(KEY_FILES_SOURCE.id);
  fm.started = false;
  fm.path = "/";
  fm.entries = null;
  state.activeOps = "key-files";
  render();
}

function openKeyUpload() {
  elements.keyFileInput.value = "";
  elements.keyUploadError.hidden = true;
  elements.keyUploadError.textContent = "";
  elements.keyUploadOverlay.hidden = false;
}

function closeKeyUpload() {
  elements.keyUploadOverlay.hidden = true;
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsText(file);
  });
}

async function confirmKeyUpload() {
  const file = elements.keyFileInput.files[0];
  if (!file) {
    elements.keyUploadError.textContent = "Choose a private key file first.";
    elements.keyUploadError.hidden = false;
    return;
  }
  if (file.size > 256 * 1024) {
    elements.keyUploadError.textContent = "That file is too large to be a private key.";
    elements.keyUploadError.hidden = false;
    return;
  }
  try {
    const content = await readFileAsText(file);
    const response = await api("/api/ssh-keys", {
      method: "POST",
      body: JSON.stringify({ filename: file.name, content })
    });
    state.sshKeys = response.keys || [];
    closeKeyUpload();
    showToast(`Uploaded "${response.name}".`);
    renderKeyList();
  } catch (error) {
    elements.keyUploadError.textContent = error.message;
    elements.keyUploadError.hidden = false;
  }
}

function fillForm(server) {
  // Preserve unsaved edits when a re-render happens mid-edit (e.g. collapsing
  // the sidebar). Navigation is handled separately by the unsaved-changes guard.
  if (isSettingsDirty()) return;
  const canEdit = state.draftNew || Boolean(server);
  for (const input of [
    elements.serverName,
    elements.serverHost,
    elements.serverUser,
    elements.serverPort,
    elements.serverBubbleLabel,
    elements.serverGroup,
    elements.serverPassword,
    elements.serverPasswordClear,
    elements.serverTags,
    elements.serverNotes
  ]) {
    input.disabled = !canEdit;
  }
  elements.saveServerButton.disabled = !canEdit;
  elements.copyInstallButton.disabled = !server;

  elements.serverName.value = server?.name || "";
  elements.serverHost.value = server?.host || "";
  elements.serverUser.value = server?.user || "root";
  elements.serverPort.value = server?.port || 22;
  elements.serverBubbleLabel.value = server?.bubbleLabel || "";
  renderGroupOptions(server?.groupId || "");
  state.draftKeyPaths = splitKeyPaths(server?.keyPath || "");
  renderKeyList();
  elements.serverPassword.value = "";
  elements.serverPassword.placeholder = server?.hasPassword
    ? "•••••• saved — leave empty to keep it"
    : "Leave empty to use keys only";
  elements.clearPasswordRow.hidden = !server?.hasPassword;
  elements.serverPasswordClear.checked = false;
  elements.serverTags.value = (server?.tags || []).join(", ");
  elements.serverNotes.value = server?.notes || "";
  elements.installCommand.textContent = installCommand(server);
  // Reset the unsaved-changes baseline to the freshly loaded values.
  state.settingsBaseline = settingsSnapshot();
}

function metricBlock(label, value) {
  const div = document.createElement("div");
  div.className = "metric";
  const span = document.createElement("span");
  span.textContent = label;
  const strong = document.createElement("strong");
  strong.textContent = value;
  div.append(span, strong);
  return div;
}

function metricValues(server) {
  const empty = { state: "Unknown", load: "--", memory: "--", disk: "--", os: "--", lastReport: "--" };
  if (!server) return empty;

  const payload = reportPayload(server);
  const ssh = parseSshMetrics(server);
  const agentAt = server.lastReport?.receivedAt || null;
  const sshAt = ssh?.refreshedAt || null;
  const agentNewer = Boolean(agentAt) && (!sshAt || new Date(agentAt) > new Date(sshAt));

  const agentDisk = Array.isArray(payload?.disk) ? payload.disk[0] : null;
  const agentValues = payload ? {
    os: payload.os?.pretty_name || null,
    load: payload.load ? `${payload.load.one} / ${payload.load.five}` : null,
    memory: payload.memory?.used_percent ?? null,
    disk: agentDisk?.used_percent ?? null,
    failed: (payload.failed_services || []).length
  } : null;
  const sshValues = ssh ? {
    os: ssh.os || null,
    load: ssh.load ? ssh.load.split(/\s+/).slice(0, 2).join(" / ") : null,
    memory: ssh.mem_used_percent || null,
    disk: ssh.disk_used_percent || null,
    failed: ssh.failed_services === "" ? null : Number(ssh.failed_services)
  } : null;

  const primary = agentNewer ? agentValues : sshValues;
  const fallback = agentNewer ? sshValues : agentValues;
  const pick = key => primary?.[key] ?? fallback?.[key] ?? null;

  const memory = pick("memory");
  const disk = pick("disk");
  const failed = pick("failed");

  let stateText = "Unknown";
  if (primary || fallback) {
    if (Number(failed) > 0) stateText = `${failed} failed service${Number(failed) > 1 ? "s" : ""}`;
    else if (Number(memory) >= 90 || Number(disk) >= 90) stateText = "Needs look";
    else stateText = "Healthy";
  }

  const newest = [agentAt, sshAt].filter(Boolean).sort().pop() || null;

  return {
    state: stateText,
    load: pick("load") || "--",
    memory: memory !== null && memory !== "" ? `${memory}%` : "--",
    disk: disk !== null && disk !== "" ? `${disk}%` : "--",
    os: pick("os") || "--",
    lastReport: newest ? formatRelative(newest) : "--"
  };
}

function renderMetrics(server) {
  const metrics = metricValues(server);
  elements.metricState.textContent = metrics.state;
  elements.metricLoad.textContent = metrics.load;
  elements.metricMemory.textContent = metrics.memory;
  elements.metricDisk.textContent = metrics.disk;
  elements.metricOs.textContent = metrics.os;
  elements.metricLastReport.textContent = metrics.lastReport;
}

function overviewText(server, sshOutput) {
  const metrics = metricValues(server);
  return [
    "== Status ==",
    `State: ${metrics.state}`,
    `OS: ${metrics.os}`,
    `Load: ${metrics.load}`,
    `Memory used: ${metrics.memory}`,
    `Disk used: ${metrics.disk}`,
    `Last update: ${metrics.lastReport}`,
    "",
    "== SSH Refresh ==",
    sshOutput || "Refresh this panel."
  ].join("\n");
}

function initials(server) {
  if (server.bubbleLabel) return String(server.bubbleLabel).slice(0, 3);
  const name = String(server.name || server.host || "?").trim();
  return name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "?";
}

function renderOpsTabs() {
  elements.opsTabs.innerHTML = "";
  for (const section of NAV_SECTIONS) {
    const label = document.createElement("div");
    label.className = "nav-section-label";
    label.textContent = section.label;
    elements.opsTabs.append(label);

    for (const opId of section.ids) {
      const op = OPS.find(item => item.id === opId);
      if (!op) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `sidebar-tab ${state.activeOps === op.id ? "active" : ""}`;
      button.title = state.featureNavCollapsed ? `${op.label} — ${op.meta}` : op.meta;
      button.innerHTML = OP_ICONS[op.id] || "";
      const tabLabel = document.createElement("span");
      tabLabel.className = "tab-label";
      tabLabel.textContent = op.label;
      button.append(tabLabel);
      button.addEventListener("click", () => {
        if (op.id === state.activeOps && !state.draftNew) return;
        guardUnsaved(() => {
          setActiveOps(op.id);
          if (op.id === "settings") {
            state.draftNew = false;
          }
          render();
        });
      });
      elements.opsTabs.append(button);
    }
  }
}

function renderGroupOptions(selectedGroupId = "") {
  elements.serverGroup.innerHTML = "";
  const ungrouped = document.createElement("option");
  ungrouped.value = "";
  ungrouped.textContent = "Ungrouped";
  elements.serverGroup.append(ungrouped);

  for (const group of sortedGroups()) {
    const option = document.createElement("option");
    option.value = group.id;
    option.textContent = group.name;
    elements.serverGroup.append(option);
  }

  elements.serverGroup.value = selectedGroupId;
}

function renderList() {
  renderOpsTabs();
  elements.featureNav.classList.toggle("collapsed", state.featureNavCollapsed);
  elements.collapseNavButton.title = state.featureNavCollapsed ? "Expand menu" : "Collapse menu";
  elements.serverRail.classList.toggle("collapsed", state.serverRailCollapsed);
  elements.collapseServerRailButton.title = state.serverRailCollapsed ? "Expand server list" : "Collapse server list";
  if (elements.railCount) {
    elements.railCount.textContent = state.servers.length > 0 ? String(state.servers.length) : "";
  }
  elements.createMenu.hidden = !state.addMenuOpen;
  elements.newServerButton.setAttribute("aria-expanded", String(state.addMenuOpen));
  elements.groupCreate.hidden = !state.groupCreateOpen;

  const query = elements.serverSearch.value.trim().toLowerCase();
  const filtered = state.servers.filter(server => {
    const haystack = [server.name, server.host, server.user, server.keyPath, server.bubbleLabel, groupNameFor(server.groupId), ...(server.tags || [])].join(" ").toLowerCase();
    return haystack.includes(query);
  });

  elements.serverList.innerHTML = "";
  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "server-empty";
    empty.textContent = state.servers.length === 0 ? "No servers yet." : "No matches.";
    elements.serverList.append(empty);
    return;
  }

  for (const section of groupedServers(filtered)) {
    elements.serverList.append(renderGroupSection(section));
  }
}

function groupedServers(servers) {
  const sections = [];
  for (const group of sortedGroups()) {
    const groupServers = servers.filter(server => server.groupId === group.id);
    if (groupServers.length > 0) {
      sections.push({ id: group.id, name: group.name, servers: groupServers });
    }
  }
  const ungrouped = servers.filter(server => !server.groupId || !state.groups.some(group => group.id === server.groupId));
  if (ungrouped.length > 0) {
    sections.push({ id: "", name: "Ungrouped", servers: ungrouped });
  }
  return sections;
}

function renderGroupSection(section) {
  const wrapper = document.createElement("section");
  wrapper.className = "group-section";
  const header = document.createElement("div");
  header.className = "group-header";
  const name = document.createElement("span");
  name.textContent = section.name;
  const count = document.createElement("span");
  count.textContent = String(section.servers.length);
  header.append(name, count);
  wrapper.append(header);
  for (const server of section.servers) {
    wrapper.append(renderServerSelector(server));
  }
  return wrapper;
}

function renderServerSelector(server) {
  const selected = server.id === state.selectedId && !state.draftNew;
  const button = document.createElement("button");
  button.type = "button";
  button.className = `server-selector ${selected ? "selected" : ""}`;
  button.title = `${server.name} · ${server.user}@${server.host}:${server.port}`;
  button.addEventListener("click", () => {
    if (server.id === state.selectedId && !state.draftNew) {
      state.addMenuOpen = false;
      state.groupCreateOpen = false;
      render();
      return;
    }
    guardUnsaved(() => {
      setSelectedId(server.id);
      state.draftNew = false;
      state.addMenuOpen = false;
      state.groupCreateOpen = false;
      render();
    });
  });

  const bubble = document.createElement("span");
  bubble.className = `server-bubble ${healthState(server)}`;
  bubble.textContent = initials(server);

  const body = document.createElement("span");
  body.className = "server-selector-body";
  const name = document.createElement("span");
  name.className = "server-selector-name";
  name.textContent = server.name;
  const host = document.createElement("span");
  host.className = "server-selector-host";
  const groupName = groupNameFor(server.groupId);
  host.textContent = groupName ? `${groupName} · ${server.user}@${server.host}:${server.port}` : `${server.user}@${server.host}:${server.port}`;
  body.append(name, host);

  const kebab = document.createElement("span");
  kebab.className = "server-kebab";
  kebab.title = "Server actions";
  kebab.setAttribute("role", "button");
  kebab.tabIndex = 0;
  kebab.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>';
  kebab.addEventListener("click", event => {
    event.stopPropagation();
    state.serverMenuOpenId = state.serverMenuOpenId === server.id ? null : server.id;
    renderList();
  });

  button.append(bubble, body, kebab);

  if (state.serverMenuOpenId !== server.id) {
    return button;
  }

  const row = document.createElement("div");
  row.className = "server-row";
  const menu = document.createElement("div");
  menu.className = "create-menu server-row-menu";
  menu.addEventListener("click", event => event.stopPropagation());
  const duplicate = document.createElement("button");
  duplicate.type = "button";
  duplicate.setAttribute("role", "menuitem");
  duplicate.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Duplicate';
  duplicate.addEventListener("click", () => guardUnsaved(() => duplicateServer(server.id)));
  menu.append(duplicate);
  row.append(button, menu);
  return row;
}

async function duplicateServer(serverId) {
  state.serverMenuOpenId = null;
  try {
    const response = await api(`/api/servers/${serverId}/duplicate`, { method: "POST" });
    state.servers.push(response.server);
    setSelectedId(response.server.id);
    showToast(`Duplicated as "${response.server.name}".`);
  } catch (error) {
    showToast(error.message);
  }
  render();
}

function renderDetails() {
  const server = selectedServer();

  if (state.activeOps === "multiterm" && !state.draftNew) {
    const count = multiDock ? multiDock.panels.length : 0;
    elements.selectedTitle.textContent = "Terminal";
    elements.selectedMeta.textContent = count > 0
      ? `${count} of ${MULTI_MAX_PANES} terminals open`
      : `Open up to ${MULTI_MAX_PANES} terminals side by side, across servers.`;
    elements.openTerminalButton.disabled = !server;
    elements.deleteServerButton.disabled = true;
    return;
  }

  if (state.activeOps === "panel" && !state.draftNew) {
    elements.selectedTitle.textContent = "Settings";
    elements.selectedMeta.textContent = state.authStatus?.email ? `Signed in as ${state.authStatus.email}` : "Panel preferences and security";
    elements.openTerminalButton.disabled = !server;
    elements.deleteServerButton.disabled = true;
    return;
  }

  if (state.draftNew) {
    elements.selectedTitle.textContent = "New server";
    elements.selectedMeta.textContent = "Fill in SSH details, then save.";
    elements.openTerminalButton.disabled = true;
    elements.deleteServerButton.disabled = true;
    elements.settingsMeta.textContent = "Fill in SSH details, then save.";
    fillForm(null);
    renderMetrics(null);
    return;
  }

  if (!server) {
    elements.selectedTitle.textContent = currentOp().label;
    elements.selectedMeta.textContent = "Pick a server from the middle column.";
    elements.openTerminalButton.disabled = true;
    elements.deleteServerButton.disabled = true;
    elements.settingsMeta.textContent = "Select a server to edit its connection details.";
    fillForm(null);
    renderMetrics(null);
    return;
  }

  const authParts = [];
  const keyCount = splitKeyPaths(server.keyPath).length;
  if (keyCount) authParts.push(keyCount === 1 ? "1 key" : `${keyCount} keys`);
  if (server.hasPassword) authParts.push("password");
  const auth = authParts.join(" + ") || "default SSH auth";
  const group = groupNameFor(server.groupId);
  elements.selectedTitle.textContent = `${server.name} · ${currentOp().label}`;
  elements.selectedMeta.textContent = `${group ? `${group} · ` : ""}${server.user}@${server.host}:${server.port} · ${auth}`;
  elements.openTerminalButton.disabled = false;
  elements.deleteServerButton.disabled = false;
  elements.settingsMeta.textContent = `${server.name} · ${group ? `${group} · ` : ""}${server.user}@${server.host}:${server.port}`;
  fillForm(server);
  renderMetrics(server);
}

function renderContent() {
  const settingsVisible = state.activeOps === "settings" || state.draftNew;
  elements.settingsPanel.hidden = !settingsVisible;
  elements.contentPane.hidden = settingsVisible;
  if (settingsVisible) {
    return;
  }

  elements.contentPane.innerHTML = "";
  elements.contentPane.classList.toggle("flush", state.activeOps === "multiterm");

  if (state.activeOps === "panel") {
    elements.contentPane.append(renderPanelSettings());
    return;
  }

  if (state.activeOps === "multiterm") {
    elements.contentPane.append(renderMultiTerminalPanel());
    return;
  }

  if (state.activeOps === "key-files") {
    elements.contentPane.append(renderKeyFilesPanel());
    return;
  }

  const server = selectedServer();

  if (state.draftNew) {
    elements.contentPane.append(renderEmptyState("New server", "Use the settings panel below to add this server."));
    return;
  }

  if (!server) {
    elements.contentPane.append(renderEmptyState(currentOp().label, "Select a server from the middle column."));
    return;
  }

  const op = currentOp();
  const panel = document.createElement("section");
  panel.className = "operation-card";

  const header = document.createElement("div");
  header.className = "operation-header";
  const titleWrap = document.createElement("div");
  const title = document.createElement("h1");
  title.textContent = op.label;
  const meta = document.createElement("p");
  meta.textContent = `${server.name} · ${op.meta} · ${refreshMeta(server, state.activeOps)}`;
  titleWrap.append(title, meta);
  header.append(titleWrap);

  if (state.activeOps !== "terminal" && state.activeOps !== "command" && state.activeOps !== "files") {
    const refresh = actionButton(isBusy(server.id, state.activeOps) ? "Running" : "Refresh", "secondary-button", () => runTaskForServer(server.id, state.activeOps));
    refresh.disabled = isBusy(server.id, state.activeOps);
    header.append(refresh);
  }

  panel.append(header);

  if (state.activeOps === "overview") {
    panel.append(renderOverviewPanel(server));
  } else if (state.activeOps === "services") {
    panel.append(renderServicesPanel(server));
  } else if (state.activeOps === "files") {
    panel.append(renderFilesPanel(sftpSourceForServer(server)));
  } else if (state.activeOps === "command") {
    panel.append(renderCommandPanel(server));
  } else if (state.activeOps === "terminal") {
    panel.append(renderTerminalPanel(server));
  } else {
    panel.append(renderOutput(server, state.activeOps, panelOutputFor(server, state.activeOps, "Refresh this panel.")));
  }

  if (state.activeOps !== "terminal" && state.activeOps !== "files") {
    panel.append(renderTaskHistory(server, state.activeOps));
  }

  elements.contentPane.append(panel);
}

/* ---------- panel settings page ---------- */

function settingsCard(title) {
  const card = document.createElement("section");
  card.className = "form-card";
  const heading = document.createElement("h2");
  heading.className = "form-card-title";
  heading.textContent = title;
  card.append(heading);
  return card;
}

function labeledInput(labelText, type = "text", placeholder = "") {
  const label = document.createElement("label");
  const span = document.createElement("span");
  span.textContent = labelText;
  const input = document.createElement("input");
  input.type = type;
  input.placeholder = placeholder;
  input.autocomplete = "off";
  label.append(span, input);
  return { label, input };
}

function renderPanelSettings() {
  const wrapper = document.createElement("div");
  wrapper.className = "panel-settings";

  const header = document.createElement("div");
  header.className = "operation-header";
  const titleWrap = document.createElement("div");
  const title = document.createElement("h1");
  title.textContent = "Settings";
  const meta = document.createElement("p");
  meta.textContent = "Appearance, account, and authentication for this panel.";
  titleWrap.append(title, meta);
  const signOut = actionButton("Sign out", "secondary-button", () => {
    logoutEverywhereOrCurrent().catch(error => showToast(error.message));
  });
  header.append(titleWrap, signOut);

  wrapper.append(
    header,
    renderAppearanceCard(),
    renderAccountCard(),
    renderTwoFactorCard(),
    renderSessionsCard(),
    renderAccessCard()
  );
  return wrapper;
}

function renderAppearanceCard() {
  const card = settingsCard("Appearance");

  const themeRow = document.createElement("div");
  themeRow.className = "setting-row";
  const themeLabel = document.createElement("div");
  themeLabel.className = "setting-row-label";
  themeLabel.innerHTML = "<strong>Theme</strong><span>Choose between dark and light mode.</span>";
  const themeOptions = document.createElement("div");
  themeOptions.className = "theme-options";
  for (const theme of ["dark", "light"]) {
    const button = actionButton(theme === "dark" ? "Dark" : "Light", "theme-option", () => {
      applyTheme(theme, currentAccent());
      render();
    });
    if (currentTheme() === theme) button.classList.add("active");
    themeOptions.append(button);
  }
  themeRow.append(themeLabel, themeOptions);

  const accentRow = document.createElement("div");
  accentRow.className = "setting-row";
  const accentLabel = document.createElement("div");
  accentLabel.className = "setting-row-label";
  accentLabel.innerHTML = "<strong>Accent color</strong><span>Used for highlights, buttons, and the active tab.</span>";
  const accentOptions = document.createElement("div");
  accentOptions.className = "accent-options";
  for (const accent of ACCENTS) {
    const swatch = actionButton("", "accent-swatch", () => {
      applyTheme(currentTheme(), accent.id);
      render();
    });
    swatch.title = accent.label;
    swatch.style.background = accent.color;
    if (currentAccent() === accent.id) swatch.classList.add("active");
    accentOptions.append(swatch);
  }
  accentRow.append(accentLabel, accentOptions);

  card.append(themeRow, accentRow);
  return card;
}

function renderAccountCard() {
  const card = settingsCard("Account");

  const emailRow = document.createElement("div");
  emailRow.className = "setting-row";
  const emailLabel = document.createElement("div");
  emailLabel.className = "setting-row-label";
  emailLabel.innerHTML = "<strong>Email</strong><span>Used to sign in to Server Deck.</span>";
  const emailValue = document.createElement("strong");
  emailValue.textContent = state.authStatus?.email || "--";
  emailRow.append(emailLabel, emailValue);

  const form = document.createElement("div");
  form.className = "inline-form";
  const current = labeledInput("Current password", "password");
  const next = labeledInput("New password", "password");
  const confirm = labeledInput("Confirm new password", "password");
  current.input.autocomplete = "current-password";
  next.input.autocomplete = "new-password";
  confirm.input.autocomplete = "new-password";
  const submit = actionButton("Update password", "primary-button", async () => {
    if (next.input.value.length < 8) {
      showToast("New password must be at least 8 characters.");
      return;
    }
    if (next.input.value !== confirm.input.value) {
      showToast("New passwords do not match.");
      return;
    }
    try {
      await api("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: current.input.value, newPassword: next.input.value })
      });
      current.input.value = next.input.value = confirm.input.value = "";
      showToast("Password updated.");
    } catch (error) {
      showToast(error.message);
    }
  });
  form.append(current.label, next.label, confirm.label, submit);

  card.append(emailRow, form);
  return card;
}

function renderTwoFactorCard() {
  const card = settingsCard("Two-factor authentication");
  const enabled = Boolean(state.authStatus?.totpEnabled);

  const row = document.createElement("div");
  row.className = "setting-row";
  const label = document.createElement("div");
  label.className = "setting-row-label";
  label.innerHTML = "<strong>Authenticator app</strong><span>Time-based codes from Google Authenticator or any TOTP app.</span>";
  const badge = document.createElement("span");
  badge.className = `badge ${enabled ? "ok" : "off"}`;
  badge.textContent = enabled ? "Enabled" : "Off";
  row.append(label, badge);
  card.append(row);

  if (enabled) {
    const form = document.createElement("div");
    form.className = "inline-form";
    const password = labeledInput("Confirm password to disable", "password");
    password.input.autocomplete = "current-password";
    const disable = actionButton("Disable 2FA", "danger-button", async () => {
      try {
        await api("/api/auth/totp/disable", {
          method: "POST",
          body: JSON.stringify({ password: password.input.value })
        });
        state.authStatus.totpEnabled = false;
        showToast("Two-factor authentication disabled.");
        render();
      } catch (error) {
        showToast(error.message);
      }
    });
    form.append(password.label, disable);
    card.append(form);
    return card;
  }

  if (!state.totpSetup) {
    const start = actionButton("Set up two-factor", "primary-button", async () => {
      try {
        state.totpSetup = await api("/api/auth/totp/init", { method: "POST" });
        render();
      } catch (error) {
        showToast(error.message);
      }
    });
    card.append(start);
    return card;
  }

  const setup = document.createElement("div");
  setup.className = "totp-setup";

  const steps = document.createElement("p");
  steps.style.margin = "0";
  steps.innerHTML = "In Google Authenticator, tap <strong>+ &rsaquo; Enter a setup key</strong>, paste the key below (account name: your email, type: time based), then enter the 6-digit code to confirm.";

  const secretLabel = document.createElement("div");
  secretLabel.className = "setting-row-label";
  secretLabel.innerHTML = "<strong>Setup key</strong>";
  const secret = document.createElement("div");
  secret.className = "totp-secret";
  secret.textContent = state.totpSetup.secret;

  const copyKey = actionButton("Copy key", "secondary-button", async () => {
    await copyText(state.totpSetup.secret);
    showToast("Setup key copied.");
  });

  const form = document.createElement("div");
  form.className = "inline-form";
  const code = labeledInput("6-digit code", "text", "123456");
  code.input.inputMode = "numeric";
  code.input.maxLength = 6;
  const verify = actionButton("Verify & enable", "primary-button", async () => {
    try {
      await api("/api/auth/totp/enable", {
        method: "POST",
        body: JSON.stringify({ code: code.input.value.trim() })
      });
      state.totpSetup = null;
      state.authStatus.totpEnabled = true;
      showToast("Two-factor authentication enabled.");
      render();
    } catch (error) {
      showToast(error.message);
    }
  });
  const cancel = actionButton("Cancel", "secondary-button", () => {
    state.totpSetup = null;
    render();
  });
  form.append(code.label, verify, cancel);

  setup.append(steps, secretLabel, secret, copyKey, form);
  card.append(setup);
  return card;
}

function renderSessionsCard() {
  const card = settingsCard("Active sessions");
  const container = document.createElement("div");
  container.textContent = "Loading sessions…";
  card.append(container);

  api("/api/auth/sessions").then(response => {
    container.textContent = "";
    for (const session of response.sessions || []) {
      const row = document.createElement("div");
      row.className = "session-row";
      const info = document.createElement("div");
      info.className = "session-row-info";
      const head = document.createElement("strong");
      head.textContent = `${session.ip || "unknown"}${session.current ? " · this device" : ""}`;
      const detail = document.createElement("span");
      detail.textContent = `Last active ${formatRelative(session.lastSeenAt)} · signed in ${formatRelative(session.createdAt)} · ${session.userAgent || "unknown client"}`;
      info.append(head, detail);
      row.append(info);
      if (!session.current) {
        row.append(actionButton("Revoke", "danger-button", async () => {
          try {
            await api(`/api/auth/sessions/${session.id}`, { method: "DELETE" });
            showToast("Session revoked.");
            render();
          } catch (error) {
            showToast(error.message);
          }
        }));
      }
      container.append(row);
    }
    if (!container.children.length) {
      container.textContent = "No active sessions.";
    }
  }).catch(error => {
    container.textContent = error.message;
  });

  return card;
}

function renderAccessCard() {
  const card = settingsCard("Access security");

  const rows = [
    ["Network access", "Only localhost and your Tailscale network (100.64.0.0/10) can reach this panel.", "Restricted", "ok"],
    ["Public exposure", "The Docker port is bound to 127.0.0.1 and your Tailscale IP — never 0.0.0.0.", "Blocked", "ok"],
    ["Storage", `Panel data is stored in ${state.config?.storage?.provider === "postgres" ? "PostgreSQL" : "a local JSON file"}.`, state.config?.storage?.provider || "--", "off"]
  ];

  for (const [name, description, badgeText, badgeKind] of rows) {
    const row = document.createElement("div");
    row.className = "setting-row";
    const label = document.createElement("div");
    label.className = "setting-row-label";
    const strong = document.createElement("strong");
    strong.textContent = name;
    const span = document.createElement("span");
    span.textContent = description;
    label.append(strong, span);
    const badge = document.createElement("span");
    badge.className = `badge ${badgeKind}`;
    badge.textContent = badgeText;
    row.append(label, badge);
    card.append(row);
  }

  return card;
}

function renderEmptyState(title, message) {
  const section = document.createElement("section");
  section.className = "empty-state";
  const h = document.createElement("h1");
  h.textContent = title;
  const p = document.createElement("p");
  p.textContent = message;
  section.append(h, p);
  return section;
}

function renderOverviewPanel(server) {
  const wrapper = document.createElement("div");
  const metrics = metricValues(server);
  const grid = document.createElement("div");
  grid.className = "status-grid";
  grid.append(
    metricBlock("State", metrics.state),
    metricBlock("Load", metrics.load),
    metricBlock("Memory", metrics.memory),
    metricBlock("Disk", metrics.disk),
    metricBlock("OS", metrics.os),
    metricBlock("Last update", metrics.lastReport)
  );
  wrapper.append(grid, renderOutput(server, "overview", overviewText(server, panelOutputFor(server, "overview", "Refresh this panel."))));
  return wrapper;
}

function renderServicesPanel(server) {
  const wrapper = document.createElement("div");
  const controls = document.createElement("div");
  controls.className = "task-controls";
  const input = document.createElement("input");
  input.autocomplete = "off";
  input.placeholder = "nginx.service";
  const select = document.createElement("select");
  for (const action of ["restart", "start", "stop", "reload", "enable", "disable"]) {
    const option = document.createElement("option");
    option.value = action;
    option.textContent = action;
    select.append(option);
  }
  controls.append(
    input,
    actionButton("Status", "secondary-button", () => runTaskForServer(server.id, "serviceStatus", { service: input.value }, "services")),
    actionButton("Logs", "secondary-button", () => runTaskForServer(server.id, "serviceLogs", { service: input.value }, "services")),
    select,
    actionButton("Apply", "primary-button", () => runTaskForServer(server.id, "serviceAction", { service: input.value, action: select.value }, "services"))
  );
  wrapper.append(controls, renderOutput(server, "services", panelOutputFor(server, "services", "Refresh this panel.")));
  return wrapper;
}

/* ---------- File manager (server SFTP + local keys folder) ---------- */

// A file-manager "source" abstracts where the files live. Server SFTP and the
// local shared keys folder reuse the same UI; only the API base, the state key,
// and a couple of labels differ.
function sftpSourceForServer(server) {
  return {
    id: server.id,
    apiBase: `/api/servers/${server.id}/sftp`,
    allowMkdir: true,
    loadingLabel: "Connecting over SFTP…"
  };
}

const KEY_FILES_SOURCE = {
  id: "key-files",
  apiBase: "/api/key-files",
  allowMkdir: false,
  loadingLabel: "Loading…"
};

function sftpStateFor(sourceId) {
  if (!state.sftp[sourceId]) {
    state.sftp[sourceId] = { path: "/", entries: null, loading: false, error: "", started: false };
  }
  return state.sftp[sourceId];
}

function joinRemotePath(dir, name) {
  return dir === "/" ? `/${name}` : `${dir}/${name}`;
}

function parentRemotePath(dir) {
  if (dir === "/") return "/";
  const parts = dir.split("/").filter(Boolean);
  parts.pop();
  return `/${parts.join("/")}` || "/";
}

function formatBytes(value) {
  const size = Number(value || 0);
  if (size < 1024) return `${size} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let result = size;
  let unit = "B";
  for (const next of units) {
    if (result < 1024) break;
    result /= 1024;
    unit = next;
  }
  return `${result.toFixed(result >= 100 ? 0 : 1)} ${unit}`;
}

async function sftpNavigate(source, targetPath) {
  const sftp = sftpStateFor(source.id);
  sftp.loading = true;
  sftp.error = "";
  sftp.started = true;
  render();
  try {
    const response = await api(`${source.apiBase}/list?path=${encodeURIComponent(targetPath)}`);
    sftp.path = response.path;
    sftp.entries = response.entries;
  } catch (error) {
    sftp.error = error.message;
  }
  sftp.loading = false;
  render();
}

async function sftpUploadFiles(source, files) {
  const sftp = sftpStateFor(source.id);
  for (const file of files) {
    const target = joinRemotePath(sftp.path, file.name);
    showToast(`Uploading ${file.name}…`);
    const response = await fetch(`${source.apiBase}/upload?path=${encodeURIComponent(target)}`, {
      method: "POST",
      body: file
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Upload of ${file.name} failed`);
    }
  }
  showToast(files.length > 1 ? `${files.length} files uploaded.` : "File uploaded.");
  await sftpNavigate(source, sftp.path);
  if (source.id === KEY_FILES_SOURCE.id) await refreshKeysAfterChange();
}

function renderFilesPanel(source) {
  const sftp = sftpStateFor(source.id);
  const wrapper = document.createElement("div");
  wrapper.className = "file-manager";

  if (!sftp.started) {
    window.requestAnimationFrame(() => {
      sftpNavigate(source, sftp.path).catch(() => {});
    });
  }

  const toolbar = document.createElement("div");
  toolbar.className = "fm-toolbar";

  const crumbs = document.createElement("div");
  crumbs.className = "fm-crumbs";
  const rootCrumb = actionButton("/", "fm-crumb", () => sftpNavigate(source, "/"));
  crumbs.append(rootCrumb);
  let crumbPath = "";
  for (const part of sftp.path.split("/").filter(Boolean)) {
    crumbPath += `/${part}`;
    const target = crumbPath;
    crumbs.append(actionButton(part, "fm-crumb", () => sftpNavigate(source, target)));
  }

  const actions = document.createElement("div");
  actions.className = "fm-actions";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.multiple = true;
  fileInput.hidden = true;
  fileInput.addEventListener("change", () => {
    const files = [...fileInput.files];
    if (files.length) {
      sftpUploadFiles(source, files).catch(error => {
        showToast(error.message);
        sftpNavigate(source, sftp.path).catch(() => {});
      });
    }
    fileInput.value = "";
  });

  actions.append(actionButton("Upload", "primary-button", () => fileInput.click()));
  if (source.allowMkdir) {
    actions.append(actionButton("New folder", "secondary-button", async () => {
      const name = window.prompt("New folder name:");
      if (!name?.trim()) return;
      try {
        await api(`${source.apiBase}/mkdir`, {
          method: "POST",
          body: JSON.stringify({ path: joinRemotePath(sftp.path, name.trim()) })
        });
        showToast("Folder created.");
        await sftpNavigate(source, sftp.path);
      } catch (error) {
        showToast(error.message);
      }
    }));
  }
  actions.append(
    actionButton(sftp.loading ? "Loading…" : "Refresh", "secondary-button", () => sftpNavigate(source, sftp.path)),
    fileInput
  );

  toolbar.append(crumbs, actions);
  wrapper.append(toolbar);

  if (sftp.error) {
    const error = document.createElement("div");
    error.className = "fm-error";
    error.textContent = sftp.error;
    wrapper.append(error);
  }

  const table = document.createElement("div");
  table.className = "fm-table";

  const head = document.createElement("div");
  head.className = "fm-row fm-head";
  for (const column of ["Name", "Size", "Modified", ""]) {
    const cell = document.createElement("span");
    cell.textContent = column;
    head.append(cell);
  }
  table.append(head);

  if (sftp.path !== "/") {
    const up = document.createElement("div");
    up.className = "fm-row fm-up";
    const name = document.createElement("button");
    name.type = "button";
    name.className = "fm-name";
    name.textContent = ".. (up)";
    name.addEventListener("click", () => sftpNavigate(source, parentRemotePath(sftp.path)));
    up.append(name, document.createElement("span"), document.createElement("span"), document.createElement("span"));
    table.append(up);
  }

  if (sftp.loading && !sftp.entries) {
    const loading = document.createElement("div");
    loading.className = "fm-empty";
    loading.textContent = source.loadingLabel;
    table.append(loading);
  } else if (sftp.entries && sftp.entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "fm-empty";
    empty.textContent = "Empty directory.";
    table.append(empty);
  } else if (sftp.entries) {
    for (const entry of sftp.entries) {
      table.append(renderFileRow(source, sftp, entry));
    }
  }

  wrapper.append(table);
  return wrapper;
}

function renderFileRow(source, sftp, entry) {
  const row = document.createElement("div");
  row.className = "fm-row";
  const entryPath = joinRemotePath(sftp.path, entry.name);
  const downloadUrl = `${source.apiBase}/download?path=${encodeURIComponent(entryPath)}`;

  const name = document.createElement("button");
  name.type = "button";
  name.className = `fm-name ${entry.isDir ? "is-dir" : ""}`;
  name.textContent = `${entry.isDir ? "📁" : entry.isLink ? "🔗" : "📄"} ${entry.name}`;
  if (entry.isDir || entry.isLink) {
    name.addEventListener("click", () => sftpNavigate(source, entryPath));
  } else {
    name.addEventListener("click", () => {
      window.open(downloadUrl, "_blank");
    });
  }

  const size = document.createElement("span");
  size.textContent = entry.isDir ? "--" : formatBytes(entry.size);

  const modified = document.createElement("span");
  modified.textContent = entry.modifiedAt ? formatDateTime(entry.modifiedAt) : "--";

  const rowActions = document.createElement("span");
  rowActions.className = "fm-row-actions";
  if (!entry.isDir) {
    const download = document.createElement("a");
    download.className = "fm-action";
    download.textContent = "Download";
    download.href = downloadUrl;
    rowActions.append(download);
  }
  rowActions.append(
    actionButton("Rename", "fm-action", async () => {
      const next = window.prompt("Rename to:", entry.name);
      if (!next?.trim() || next.trim() === entry.name) return;
      try {
        await api(`${source.apiBase}/rename`, {
          method: "POST",
          body: JSON.stringify({ from: entryPath, to: joinRemotePath(sftp.path, next.trim()) })
        });
        showToast("Renamed.");
        await sftpNavigate(source, sftp.path);
        if (source.id === KEY_FILES_SOURCE.id) refreshKeysAfterChange();
      } catch (error) {
        showToast(error.message);
      }
    }),
    actionButton("Delete", "fm-action danger", async () => {
      const confirmed = window.confirm(`Delete "${entry.name}"?${entry.isDir ? "\n\nOnly empty directories can be deleted." : ""}`);
      if (!confirmed) return;
      try {
        await api(`${source.apiBase}/delete`, {
          method: "POST",
          body: JSON.stringify({ path: entryPath, isDir: entry.isDir })
        });
        showToast("Deleted.");
        await sftpNavigate(source, sftp.path);
        if (source.id === KEY_FILES_SOURCE.id) refreshKeysAfterChange();
      } catch (error) {
        showToast(error.message);
      }
    })
  );

  row.append(name, size, modified, rowActions);
  return row;
}

// The keys browser is the same file-manager UI bound to the local keys folder.
function renderKeyFilesPanel() {
  const wrapper = document.createElement("section");
  wrapper.className = "operation-card";

  const header = document.createElement("div");
  header.className = "operation-header";
  const titleWrap = document.createElement("div");
  const title = document.createElement("h1");
  title.textContent = "SSH keys";
  const meta = document.createElement("p");
  meta.textContent = `Shared keys folder · ${state.keyHostDir || state.keyUploadDir}`;
  titleWrap.append(title, meta);
  header.append(titleWrap, actionButton("Done", "secondary-button", () => {
    setActiveOps("settings");
    render();
  }));
  wrapper.append(header, renderFilesPanel(KEY_FILES_SOURCE));
  return wrapper;
}

// Keep the server-form key dropdown and the keys card in sync after a change
// made from the keys file browser.
async function refreshKeysAfterChange() {
  try {
    const response = await api("/api/ssh-keys");
    state.sshKeys = response.keys || [];
    state.keyUploadDir = response.uploadDir || state.keyUploadDir;
    state.keyHostDir = response.hostDir || state.keyHostDir;
  } catch {
    // Non-fatal: the dropdown just won't refresh until the next load.
  }
}

function renderCommandPanel(server) {
  const wrapper = document.createElement("div");
  const controls = document.createElement("div");
  controls.className = "task-controls compact";
  const input = document.createElement("input");
  input.autocomplete = "off";
  input.placeholder = "uptime && df -h";
  controls.append(input, actionButton("Run", "primary-button", () => runTaskForServer(server.id, "command", { command: input.value }, "command")));
  wrapper.append(controls, renderOutput(server, "command", panelOutputFor(server, "command", "Run a command.")));
  return wrapper;
}

function renderTerminalPanel(server) {
  const wrapper = document.createElement("div");
  const controls = document.createElement("div");
  controls.className = "terminal-header";
  const tabs = document.createElement("div");
  tabs.className = "terminal-tabs";

  const serverTerminals = state.terminals.filter(terminal => terminal.serverId === server.id);
  for (const terminal of serverTerminals) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = `terminal-tab ${terminal.id === state.activeTerminalId ? "active" : ""}`;
    tab.textContent = terminal.title;
    tab.addEventListener("click", () => {
      state.activeTerminalId = terminal.id;
      render();
    });
    tabs.append(tab);
  }

  const buttons = document.createElement("div");
  buttons.className = "terminal-actions";
  buttons.append(
    actionButton("New session", "primary-button", () => openTerminalForServer(server)),
    actionButton("Close session", "secondary-button", () => closeActiveTerminal(server.id))
  );
  controls.append(tabs, buttons);

  const host = document.createElement("div");
  host.className = "terminal-host";
  host.id = "terminalHost";

  if (serverTerminals.length === 0) {
    const empty = document.createElement("div");
    empty.className = "terminal-empty";
    empty.textContent = "No open sessions. Click New session to connect.";
    host.append(empty);
  }

  wrapper.append(controls, host);
  window.requestAnimationFrame(() => mountActiveTerminal(server.id));
  return wrapper;
}

function renderOutput(server, task, text) {
  const pre = document.createElement("pre");
  pre.className = "ops-output";
  pre.dataset.serverId = server.id;
  pre.dataset.task = task;
  pre.textContent = text;
  return pre;
}

function renderTaskHistory(server, task) {
  const section = document.createElement("section");
  section.className = "task-history";
  const header = document.createElement("div");
  header.className = "task-history-header";
  const title = document.createElement("h2");
  title.textContent = "History";
  const meta = document.createElement("span");
  meta.textContent = refreshMeta(server, task);
  header.append(title, meta);
  section.append(header);

  const entries = taskHistoryFor(server, task).slice(0, 8);
  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "task-history-empty";
    empty.textContent = "No refresh history yet.";
    section.append(empty);
    return section;
  }

  const list = document.createElement("div");
  list.className = "task-history-list";
  for (const entry of entries) {
    const row = document.createElement("div");
    row.className = "task-history-row";
    const time = document.createElement("strong");
    time.textContent = formatDateTime(entry.refreshedAt);
    const detail = document.createElement("span");
    const action = entry.actionTask && entry.actionTask !== entry.task ? `${entry.actionTask} · ` : "";
    const exit = entry.exitCode === null || entry.exitCode === undefined ? "exit n/a" : `exit ${entry.exitCode}`;
    detail.textContent = `${action}${entry.status || "ok"} · ${exit} · ${entry.durationMs || 0}ms`;
    row.append(time, detail);
    list.append(row);
  }
  section.append(list);
  return section;
}

function actionButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", event => {
    event.stopPropagation();
    onClick();
  });
  return button;
}

function render() {
  renderList();
  renderDetails();
  renderContent();
}

/* ---------- authentication ---------- */

function showAuthOverlay(mode, options = {}) {
  const setup = mode === "setup";
  elements.authOverlay.hidden = false;
  elements.authTitle.textContent = setup ? "Create your account" : "Sign in";
  elements.authSubtitle.textContent = setup
    ? "First run: choose the email and password you will use to unlock Server Deck."
    : "Enter your email and password to continue.";
  elements.authSubmit.textContent = setup ? "Create account" : "Sign in";
  elements.authConfirmRow.hidden = !setup;
  elements.authPasswordConfirm.required = setup;
  elements.authPassword.autocomplete = setup ? "new-password" : "current-password";
  elements.authTotpRow.hidden = !options.totpRequired;
  elements.authError.hidden = !options.error;
  elements.authError.textContent = options.error || "";
  elements.authOverlay.dataset.mode = mode;
  if (options.totpRequired) elements.authTotp.focus();
  else elements.authEmail.focus();
}

function hideAuthOverlay() {
  elements.authOverlay.hidden = true;
  elements.authPassword.value = "";
  elements.authPasswordConfirm.value = "";
  elements.authTotp.value = "";
}

async function submitAuth(event) {
  event.preventDefault();
  const mode = elements.authOverlay.dataset.mode || "login";
  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;
  elements.authError.hidden = true;
  elements.authSubmit.disabled = true;

  try {
    if (mode === "setup") {
      if (password !== elements.authPasswordConfirm.value) {
        throw new Error("Passwords do not match.");
      }
      await api("/api/auth/setup", { method: "POST", body: JSON.stringify({ email, password }) });
    } else {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, totp: elements.authTotp.value.trim() })
      });
    }
    state.authStatus = await api("/api/auth/status");
    hideAuthOverlay();
    await load();
  } catch (error) {
    showAuthOverlay(mode, {
      error: error.message,
      totpRequired: Boolean(error.body?.totpRequired) || !elements.authTotpRow.hidden
    });
  } finally {
    elements.authSubmit.disabled = false;
  }
}

async function boot() {
  try {
    state.authStatus = await api("/api/auth/status");
  } catch (error) {
    showToast(error.message);
    return;
  }
  if (state.authStatus.setupRequired) {
    showAuthOverlay("setup");
    return;
  }
  if (!state.authStatus.authenticated) {
    showAuthOverlay("login");
    return;
  }
  hideAuthOverlay();
  await load();
}

async function logoutEverywhereOrCurrent() {
  await api("/api/auth/logout", { method: "POST" });
  window.location.reload();
}

async function load() {
  const [config, servers, groups, sshKeys] = await Promise.all([
    api("/api/config"),
    api("/api/servers"),
    api("/api/groups"),
    api("/api/ssh-keys")
  ]);
  state.config = config;
  state.servers = servers.servers;
  state.groups = groups.groups;
  state.sshKeys = sshKeys.keys || [];
  state.keyUploadDir = sshKeys.uploadDir || state.keyUploadDir;
  state.keyHostDir = sshKeys.hostDir || sshKeys.uploadDir || state.keyHostDir;
  if (state.selectedId && !state.servers.some(server => server.id === state.selectedId)) {
    setSelectedId(null);
  }
  if (!state.selectedId && state.servers[0] && !state.draftNew) {
    setSelectedId(state.servers[0].id);
  }
  render();
}

async function createGroup() {
  const name = elements.groupNameInput.value.trim();
  if (!name) {
    showToast("Group name is required.");
    return;
  }
  try {
    const response = await api("/api/groups", {
      method: "POST",
      body: JSON.stringify({ name })
    });
    state.groups.push(response.group);
    elements.groupNameInput.value = "";
    state.groupCreateOpen = false;
    showToast("Group created.");
    render();
  } catch (error) {
    showToast(error.message);
  }
}

async function saveServer() {
  const payload = formValue();
  if (!payload.host) {
    showToast("Host is required.");
    return false;
  }
  try {
    if (state.draftNew) {
      const response = await api("/api/servers", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      state.servers.unshift(response.server);
      setSelectedId(response.server.id);
      state.draftNew = false;
      setActiveOps("settings");
      showToast("Server saved.");
    } else if (state.selectedId) {
      const response = await api(`/api/servers/${state.selectedId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      state.servers = state.servers.map(server => server.id === response.server.id ? response.server : server);
      showToast("Server updated.");
    }
    // Mark clean so the re-render reloads the form instead of preserving it.
    state.settingsBaseline = settingsSnapshot();
    render();
    return true;
  } catch (error) {
    showToast(error.message);
    return false;
  }
}

async function deleteServer() {
  const server = selectedServer();
  if (!server) return;
  const confirmed = window.confirm(`Delete server "${server.name}"?\n\nThis removes it from Server Deck. This cannot be undone.`);
  if (!confirmed) return;
  await api(`/api/servers/${server.id}`, { method: "DELETE" });
  state.servers = state.servers.filter(item => item.id !== server.id);
  disposeTerminalsForServer(server.id);
  closeMultiPanesForServer(server.id);
  setSelectedId(state.servers[0]?.id || null);
  showToast("Server deleted.");
  render();
}

async function runTaskForServer(serverId, task = state.activeOps, extra = {}, outputTask = state.activeOps) {
  const server = state.servers.find(item => item.id === serverId);
  if (!server) return;

  setBusy(serverId, outputTask, true);
  setOutput(serverId, outputTask, "Running...");
  render();

  try {
    const response = await api(`/api/servers/${server.id}/task`, {
      method: "POST",
      body: JSON.stringify({ task, outputTask, ...extra })
    });
    if (response.server) {
      state.servers = state.servers.map(item => item.id === response.server.id ? response.server : item);
    }
    const footer = [
      "",
      `refreshed=${response.historyEntry ? formatDateTime(response.historyEntry.refreshedAt) : "--"} exit=${response.exitCode ?? "n/a"} duration=${response.durationMs}ms${response.timedOut ? " timed-out" : ""}`
    ].join("\n");
    setOutput(serverId, outputTask, `${response.stdout || ""}${response.stderr ? `\n[stderr]\n${response.stderr}` : ""}${footer}`.trim());
  } catch (error) {
    setOutput(serverId, outputTask, error.message);
    showToast(error.message);
  } finally {
    setBusy(serverId, outputTask, false);
    render();
  }
}

/* ---------- xterm.js terminal sessions ---------- */

const xtermSessions = new Map();

function xtermTheme() {
  return {
    background: "#0a0d12",
    foreground: "#dde3ea",
    cursor: "#5b8cff",
    cursorAccent: "#0a0d12",
    selectionBackground: "rgba(91, 140, 255, 0.35)"
  };
}

function openTerminal() {
  const server = selectedServer();
  if (!server) return;
  setActiveOps("multiterm");
  render();
  const tryAdd = attempts => {
    if (multiDock) {
      addMultiPane(server.id);
      return;
    }
    if (attempts > 0) window.requestAnimationFrame(() => tryAdd(attempts - 1));
  };
  window.requestAnimationFrame(() => tryAdd(10));
}

function openTerminalForServer(server) {
  const id = randomId();
  const container = document.createElement("div");
  container.className = "xterm-holder";

  const term = new window.Terminal({
    cursorBlink: true,
    fontSize: 13,
    fontFamily: 'JetBrains Mono, SFMono-Regular, Consolas, monospace',
    scrollback: 8000,
    theme: xtermTheme()
  });
  const fit = new window.FitAddon.FitAddon();
  term.loadAddon(fit);

  const count = state.terminals.filter(item => item.serverId === server.id).length + 1;
  xtermSessions.set(id, { id, serverId: server.id, term, fit, container, socket: null, opened: false });
  state.terminals.push({ id, serverId: server.id, title: `${server.name} ${count}` });
  state.activeTerminalId = id;
  setActiveOps("terminal");
  render();
}

function connectTerminalSocket(session) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const params = new URLSearchParams({
    serverId: session.serverId,
    cols: String(session.term.cols),
    rows: String(session.term.rows)
  });
  const socket = new WebSocket(`${protocol}//${window.location.host}/ws/terminal?${params}`);
  session.socket = socket;

  socket.addEventListener("message", event => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message.type === "output" || message.type === "status") {
      session.term.write(String(message.data || ""));
    }
  });

  socket.addEventListener("close", () => {
    session.term.write("\r\n\x1b[90m[disconnected]\x1b[0m\r\n");
    session.onSocketClose?.();
  });

  session.term.onData(data => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "input", data }));
    }
    session.onInput?.(data);
  });

  session.term.onResize(({ cols, rows }) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "resize", cols, rows }));
    }
  });
}

function activeTerminalSession(serverId) {
  const active = xtermSessions.get(state.activeTerminalId);
  if (active && active.serverId === serverId) return active;
  const fallback = [...state.terminals].reverse().find(item => item.serverId === serverId);
  return fallback ? xtermSessions.get(fallback.id) : null;
}

function mountActiveTerminal(serverId) {
  const host = document.querySelector("#terminalHost");
  const session = activeTerminalSession(serverId);
  if (!host || !session) return;
  if (session.container.parentElement !== host) {
    host.innerHTML = "";
    host.append(session.container);
  }
  if (!session.opened) {
    session.opened = true;
    session.term.open(session.container);
    session.fit.fit();
    connectTerminalSocket(session);
  } else {
    session.fit.fit();
  }
  session.term.focus();
}

function disposeTerminalSession(id) {
  const session = xtermSessions.get(id);
  if (!session) return;
  try {
    session.socket?.close();
  } catch {
    // Socket may already be closed.
  }
  session.term.dispose();
  xtermSessions.delete(id);
  state.terminals = state.terminals.filter(item => item.id !== id);
}

function closeActiveTerminal(serverId) {
  const session = activeTerminalSession(serverId);
  if (!session) return;
  disposeTerminalSession(session.id);
  state.activeTerminalId = [...state.terminals].reverse().find(item => item.serverId === serverId)?.id || null;
  render();
}

function disposeTerminalsForServer(serverId) {
  for (const terminal of state.terminals.filter(item => item.serverId === serverId)) {
    disposeTerminalSession(terminal.id);
  }
}

window.addEventListener("resize", () => {
  const session = xtermSessions.get(state.activeTerminalId);
  if (session?.opened && document.querySelector("#terminalHost")) {
    session.fit.fit();
  }
});

/* ---------- Multi Terminals (dockview grid) ----------
   Up to MULTI_MAX_PANES xterm.js terminals tiled in a dockview-core grid.
   Pane sessions and the dock DOM live in module scope so they survive the
   full re-renders, exactly like the single-terminal containers above. */

const MULTI_MAX_PANES = 10;
const MULTI_PANE_COLORS = ["#5b8cff", "#2fbf8f", "#f59e0b", "#f0608c", "#8b7cf6", "#22b8cf", "#e8590c", "#94d82d", "#da77f2", "#4dabf7"];

let multiDock = null;
let multiUi = null;
const multiPanes = new Map();
let multiLayoutSaveTimer = 0;
const multiBroadcast = { on: false, live: false };

function multiBroadcastTargets() {
  return [...multiPanes.values()].filter(pane =>
    pane.broadcastEnabled && pane.session?.socket?.readyState === WebSocket.OPEN);
}

function setMultiBroadcast(on, reason = "") {
  if (multiBroadcast.on === on) return;
  multiBroadcast.on = on;
  if (!on) {
    multiBroadcast.live = false;
    if (reason) showToast(`Broadcast turned off — ${reason}`);
  }
  refreshBroadcastUi();
}

function refreshBroadcastUi() {
  if (!multiUi) return;
  const targets = multiBroadcastTargets();
  multiUi.bcastBar.hidden = !multiBroadcast.on;
  multiUi.broadcastButton.className = multiBroadcast.on ? "danger-button" : "secondary-button";
  multiUi.broadcastButton.textContent = multiBroadcast.on ? "Broadcast ON" : "Broadcast";
  multiUi.bcastBadge.textContent = `BROADCAST → ${targets.length} terminal${targets.length === 1 ? "" : "s"}`;
  multiUi.bcastInput.placeholder = "Type a command, press Enter to send to the marked terminals";
  multiUi.bcastLive.checked = multiBroadcast.live;
  for (const pane of multiPanes.values()) {
    const enrolled = multiBroadcast.on && pane.broadcastEnabled && Boolean(pane.session);
    pane.root.classList.toggle("broadcasting", enrolled);
    if (pane.broadcastToggle) {
      pane.broadcastToggle.hidden = !multiBroadcast.on;
      pane.broadcastToggle.classList.toggle("active", pane.broadcastEnabled);
      pane.broadcastToggle.title = pane.broadcastEnabled ? "Exclude from broadcast" : "Include in broadcast";
    }
  }
}

function sendMultiBroadcastCommand(value) {
  const command = String(value || "");
  if (!command.trim()) return;
  const targets = multiBroadcastTargets();
  if (targets.length === 0) {
    showToast("No connected terminals are included in the broadcast.");
    return;
  }
  for (const target of targets) {
    target.session.socket.send(JSON.stringify({ type: "input", data: `${command}\r` }));
  }
}

function serverAccentColor(serverId) {
  let hash = 0;
  for (const ch of String(serverId)) {
    hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  }
  return MULTI_PANE_COLORS[hash % MULTI_PANE_COLORS.length];
}

function multiIconButton(title, svg, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "multi-icon-button";
  button.title = title;
  button.innerHTML = svg;
  button.addEventListener("click", onClick);
  return button;
}

function buildMultiRoot() {
  const root = document.createElement("section");
  root.className = "multi-wrap";

  const toolbar = document.createElement("div");
  toolbar.className = "multi-toolbar";

  const left = document.createElement("div");
  left.className = "multi-toolbar-side";
  const addButton = actionButton("New terminal", "primary-button", () => addMultiPane(""));
  const count = document.createElement("span");
  count.className = "multi-count";
  left.append(addButton, count);

  const right = document.createElement("div");
  right.className = "multi-toolbar-side";
  const hint = document.createElement("span");
  hint.className = "multi-hint";
  hint.textContent = "Drag tabs to split · drag dividers to resize · Alt+1–9 to jump";
  const focusButton = actionButton("Focus mode", "secondary-button", () => {
    const collapse = !(state.featureNavCollapsed && state.serverRailCollapsed);
    state.featureNavCollapsed = collapse;
    state.serverRailCollapsed = collapse;
    writeStoredValue(STORAGE_KEYS.navCollapsed, collapse ? "1" : "");
    writeStoredValue(STORAGE_KEYS.railCollapsed, collapse ? "1" : "");
    render();
  });
  const closeAllButton = actionButton("Close all", "secondary-button", () => {
    const total = multiDock ? multiDock.panels.length : 0;
    if (total === 0) return;
    if (!window.confirm(`Close all ${total} terminal${total === 1 ? "" : "s"}?`)) return;
    multiDock.closeAllGroups();
    refreshMultiToolbar();
  });
  const broadcastButton = actionButton("Broadcast", "secondary-button", () => {
    if (multiBroadcast.on) {
      setMultiBroadcast(false);
    } else {
      multiBroadcast.on = true;
      refreshBroadcastUi();
      multiUi.bcastInput.focus();
    }
  });
  right.append(hint, broadcastButton, focusButton, closeAllButton);

  toolbar.append(left, right);

  const bcastBar = document.createElement("div");
  bcastBar.className = "multi-bcast-bar";
  bcastBar.hidden = true;
  const bcastBadge = document.createElement("span");
  bcastBadge.className = "multi-bcast-badge";
  const bcastInput = document.createElement("input");
  bcastInput.autocomplete = "off";
  bcastInput.spellcheck = false;
  bcastInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMultiBroadcastCommand(bcastInput.value);
      bcastInput.value = "";
    } else if (event.key === "Escape") {
      setMultiBroadcast(false);
    }
  });
  const bcastSend = actionButton("Send", "secondary-button", () => {
    sendMultiBroadcastCommand(bcastInput.value);
    bcastInput.value = "";
  });
  const bcastLiveLabel = document.createElement("label");
  bcastLiveLabel.className = "multi-bcast-live";
  bcastLiveLabel.title = "Forward every keystroke typed in a marked terminal to all other marked terminals (tmux synchronize-panes)";
  const bcastLive = document.createElement("input");
  bcastLive.type = "checkbox";
  bcastLive.addEventListener("change", () => {
    multiBroadcast.live = bcastLive.checked;
  });
  bcastLiveLabel.append(bcastLive, document.createTextNode("Live keys"));
  bcastBar.append(bcastBadge, bcastInput, bcastSend, bcastLiveLabel);

  const dockHost = document.createElement("div");
  dockHost.className = "multi-dock";

  root.append(toolbar, bcastBar, dockHost);
  multiUi = { root, addButton, count, focusButton, closeAllButton, broadcastButton, bcastBar, bcastBadge, bcastInput, bcastLive, dockHost };
}

function refreshMultiToolbar() {
  if (!multiUi) return;
  const total = multiDock ? multiDock.panels.length : 0;
  multiUi.count.textContent = `${total} / ${MULTI_MAX_PANES}`;
  multiUi.addButton.disabled = total >= MULTI_MAX_PANES;
  multiUi.closeAllButton.disabled = total === 0;
  const bothCollapsed = state.featureNavCollapsed && state.serverRailCollapsed;
  multiUi.focusButton.textContent = bothCollapsed ? "Exit focus mode" : "Focus mode";
  multiUi.focusButton.title = bothCollapsed ? "Expand both side menus" : "Collapse both side menus for more space";
  refreshBroadcastUi();
}

function renderMultiTerminalPanel() {
  if (!multiUi) buildMultiRoot();
  refreshMultiToolbar();
  window.requestAnimationFrame(() => {
    if (!multiDock) initMultiDock();
    refreshMultiPanes();
  });
  return multiUi.root;
}

function initMultiDock() {
  if (multiDock) return;
  const dockview = window["dockview-core"];
  if (!dockview) {
    multiUi.dockHost.textContent = "Failed to load the layout library (dockview-core). Reload the page or reinstall dependencies.";
    return;
  }

  multiDock = dockview.createDockview(multiUi.dockHost, {
    theme: { ...dockview.themeAbyss, gap: 5 },
    scrollbars: "native",
    getTabContextMenuItems: () => ["close", "closeOthers", "closeAll"],
    createComponent: options => createMultiPaneComponent(options.id),
    createWatermarkComponent: createMultiWatermark,
    createRightHeaderActionComponent: createMultiGroupActions
  });

  multiDock.onDidLayoutChange(() => {
    scheduleMultiLayoutSave();
    refreshMultiToolbar();
  });

  const stored = readStoredValue(STORAGE_KEYS.multiLayout);
  if (stored) {
    try {
      multiDock.fromJSON(JSON.parse(stored));
    } catch {
      writeStoredValue(STORAGE_KEYS.multiLayout, "");
    }
  }
  refreshMultiToolbar();
}

function scheduleMultiLayoutSave() {
  window.clearTimeout(multiLayoutSaveTimer);
  multiLayoutSaveTimer = window.setTimeout(() => {
    if (!multiDock) return;
    if (multiDock.panels.length === 0) {
      writeStoredValue(STORAGE_KEYS.multiLayout, "");
      return;
    }
    try {
      writeStoredValue(STORAGE_KEYS.multiLayout, JSON.stringify(multiDock.toJSON()));
    } catch {
      // Serialization failures should never break the UI.
    }
  }, 400);
}

function multiSplitTarget() {
  let best = null;
  for (const group of multiDock.groups) {
    const area = (group.api.width || 0) * (group.api.height || 0);
    if (!best || area > best.area) best = { group, area };
  }
  if (!best) return undefined;
  const direction = (best.group.api.width || 0) >= (best.group.api.height || 0) ? "right" : "below";
  return { referenceGroup: best.group, direction };
}

function addMultiPane(serverId = "") {
  if (!multiDock) return;
  if (multiDock.panels.length >= MULTI_MAX_PANES) {
    showToast(`Limit of ${MULTI_MAX_PANES} terminals reached.`);
    return;
  }
  const server = state.servers.find(item => item.id === serverId);
  const panel = multiDock.addPanel({
    id: `mt-${randomId()}`,
    component: "terminal",
    title: server ? (server.name || server.host) : "New terminal",
    params: { serverId: server ? server.id : "" },
    position: multiSplitTarget()
  });
  panel.api.setActive();
  refreshMultiToolbar();
}

function createMultiPaneComponent(panelId) {
  const root = document.createElement("div");
  root.className = "multi-pane";
  const pane = { id: panelId, root, serverId: "", session: null, api: null, fitTimer: 0, broadcastEnabled: true, broadcastToggle: null };
  return {
    element: root,
    init(params) {
      pane.api = params.api;
      pane.serverId = params.params?.serverId || "";
      multiPanes.set(panelId, pane);
      params.api.onDidActiveChange(event => {
        pane.root.classList.toggle("focused", event.isActive);
        if (event.isActive && pane.session) pane.session.term.focus();
      });
      params.api.onDidDimensionsChange(() => scheduleMultiPaneFit(pane));
      renderMultiPaneContent(pane);
    },
    dispose() {
      multiPanes.delete(panelId);
      disposeMultiPaneSession(pane);
      if (multiBroadcast.on) setMultiBroadcast(false, "a terminal closed.");
    }
  };
}

function renderMultiPaneContent(pane) {
  const server = state.servers.find(item => item.id === pane.serverId);
  if (server) {
    startMultiPaneSession(pane, server);
  } else {
    renderMultiPanePicker(pane);
  }
}

function renderMultiPanePicker(pane) {
  disposeMultiPaneSession(pane);
  pane.root.innerHTML = "";
  pane.root.style.removeProperty("--pane-accent");

  const picker = document.createElement("div");
  picker.className = "multi-pane-picker";

  const title = document.createElement("strong");
  title.textContent = "Connect a terminal";
  picker.append(title);

  if (state.servers.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No servers available yet.";
    picker.append(empty);
  } else {
    if (pane.serverId) {
      const note = document.createElement("p");
      note.textContent = "The saved server is gone — pick another.";
      picker.append(note);
    }
    const select = document.createElement("select");
    for (const section of groupedServers(state.servers)) {
      const optgroup = document.createElement("optgroup");
      optgroup.label = section.name;
      for (const server of section.servers) {
        const option = document.createElement("option");
        option.value = server.id;
        option.textContent = `${server.name || server.host} · ${server.user || "root"}@${server.host}`;
        optgroup.append(option);
      }
      select.append(optgroup);
    }
    if (state.selectedId && state.servers.some(item => item.id === state.selectedId)) {
      select.value = state.selectedId;
    }
    const connect = actionButton("Connect", "primary-button", () => {
      const server = state.servers.find(item => item.id === select.value);
      if (server) startMultiPaneSession(pane, server);
    });
    picker.append(select, connect);
  }

  pane.root.append(picker);
}

function startMultiPaneSession(pane, server) {
  disposeMultiPaneSession(pane);
  pane.serverId = server.id;
  pane.api?.updateParameters({ serverId: server.id });
  pane.api?.setTitle(server.name || server.host);
  pane.root.innerHTML = "";
  pane.root.style.setProperty("--pane-accent", serverAccentColor(server.id));

  const head = document.createElement("div");
  head.className = "multi-pane-head";
  const dot = document.createElement("span");
  dot.className = "pane-dot";
  const name = document.createElement("span");
  name.className = "pane-name";
  name.textContent = server.name || server.host;
  const host = document.createElement("span");
  host.className = "pane-host";
  host.textContent = `${server.user || "root"}@${server.host}:${server.port || 22}`;
  const actions = document.createElement("div");
  actions.className = "pane-actions";
  actions.append(
    multiIconButton("Change server", '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>', () => {
      pane.serverId = "";
      pane.api?.updateParameters({ serverId: "" });
      pane.api?.setTitle("New terminal");
      if (multiBroadcast.on) setMultiBroadcast(false, "a terminal changed server.");
      renderMultiPanePicker(pane);
    })
  );
  const broadcastToggle = multiIconButton("Exclude from broadcast", '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5M19.1 4.9c3.9 3.9 3.9 10.3 0 14.2"/><circle cx="12" cy="12" r="2"/></svg>', () => {
    pane.broadcastEnabled = !pane.broadcastEnabled;
    refreshBroadcastUi();
  });
  broadcastToggle.hidden = !multiBroadcast.on;
  pane.broadcastToggle = broadcastToggle;
  actions.prepend(broadcastToggle);
  head.append(dot, name, host, actions);

  const termHost = document.createElement("div");
  termHost.className = "multi-pane-term";
  pane.root.append(head, termHost);

  const term = new window.Terminal({
    cursorBlink: true,
    fontSize: 13,
    fontFamily: 'JetBrains Mono, SFMono-Regular, Consolas, monospace',
    scrollback: 8000,
    theme: xtermTheme()
  });
  const fit = new window.FitAddon.FitAddon();
  term.loadAddon(fit);

  const session = { id: `multi-${pane.id}`, serverId: server.id, term, fit, container: termHost, socket: null, opened: true };
  session.onSocketClose = () => {
    if (pane.session === session) showMultiPaneReconnect(pane);
    refreshBroadcastUi();
  };
  session.onInput = data => {
    if (!multiBroadcast.on || !multiBroadcast.live || !pane.broadcastEnabled) return;
    for (const target of multiBroadcastTargets()) {
      if (target !== pane) {
        target.session.socket.send(JSON.stringify({ type: "input", data }));
      }
    }
  };
  pane.session = session;

  term.open(termHost);
  window.requestAnimationFrame(() => {
    if (pane.session !== session) return;
    try {
      fit.fit();
    } catch {
      // The pane can be zero-sized mid-drag; the next dimension event refits.
    }
    connectTerminalSocket(session);
    if (pane.api?.isActive) term.focus();
  });
  refreshBroadcastUi();
}

function showMultiPaneReconnect(pane) {
  if (!pane.root.isConnected || pane.root.querySelector(".multi-pane-overlay")) return;
  const overlay = document.createElement("div");
  overlay.className = "multi-pane-overlay";
  const label = document.createElement("span");
  label.textContent = "Disconnected";
  const reconnect = actionButton("Reconnect", "secondary-button", () => {
    overlay.remove();
    const server = state.servers.find(item => item.id === pane.serverId);
    if (server) {
      startMultiPaneSession(pane, server);
    } else {
      renderMultiPanePicker(pane);
    }
  });
  overlay.append(label, reconnect);
  pane.root.append(overlay);
}

function disposeMultiPaneSession(pane) {
  const session = pane.session;
  if (!session) return;
  pane.session = null;
  session.onSocketClose = null;
  session.onInput = null;
  try {
    session.socket?.close();
  } catch {
    // Socket may already be closed.
  }
  try {
    session.term.dispose();
  } catch {
    // Disposing twice throws; the pane is going away regardless.
  }
}

function scheduleMultiPaneFit(pane) {
  window.clearTimeout(pane.fitTimer);
  pane.fitTimer = window.setTimeout(() => {
    window.requestAnimationFrame(() => {
      if (!pane.session || !pane.root.isConnected || pane.root.clientWidth === 0) return;
      try {
        pane.session.fit.fit();
      } catch {
        // Ignore fits against hidden panes.
      }
    });
  }, 150);
}

function refreshMultiPanes() {
  for (const pane of multiPanes.values()) {
    if (!pane.session && pane.serverId) {
      const server = state.servers.find(item => item.id === pane.serverId);
      if (server) startMultiPaneSession(pane, server);
    } else if (pane.session && pane.serverId) {
      const server = state.servers.find(item => item.id === pane.serverId);
      const title = server ? (server.name || server.host) : null;
      if (title && pane.api && multiDock?.getPanel(pane.id)?.title !== title) {
        pane.api.setTitle(title);
      }
    }
    scheduleMultiPaneFit(pane);
  }
}

function closeMultiPanesForServer(serverId) {
  if (!multiDock) return;
  for (const pane of [...multiPanes.values()]) {
    if (pane.serverId !== serverId) continue;
    const panel = multiDock.getPanel(pane.id);
    if (panel) multiDock.removePanel(panel);
  }
  refreshMultiToolbar();
}

function createMultiWatermark() {
  const element = document.createElement("div");
  element.className = "multi-watermark";
  const icon = document.createElement("div");
  icon.className = "multi-watermark-icon";
  icon.innerHTML = OP_ICONS.multiterm;
  const title = document.createElement("strong");
  title.textContent = "No terminals yet";
  const text = document.createElement("p");
  text.textContent = `Open up to ${MULTI_MAX_PANES} SSH terminals side by side — mix servers freely.`;
  const button = actionButton("New terminal", "primary-button", () => addMultiPane(""));
  element.append(icon, title, text, button);
  return { element, init() {}, dispose() {} };
}

function createMultiGroupActions(group) {
  const element = document.createElement("div");
  element.className = "multi-group-actions";
  const button = multiIconButton("Maximize pane", '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>', () => {
    if (!multiDock) return;
    if (multiDock.hasMaximizedGroup()) {
      multiDock.exitMaximizedGroup();
    } else {
      const panel = group.activePanel;
      if (panel) multiDock.maximizeGroup(panel);
    }
  });
  element.append(button);
  let subscription = null;
  return {
    element,
    init() {
      subscription = multiDock?.onDidMaximizedGroupChange(() => {
        const maximized = multiDock.hasMaximizedGroup();
        button.title = maximized ? "Restore layout" : "Maximize pane";
        button.classList.toggle("active", maximized);
      });
    },
    dispose() {
      subscription?.dispose();
    }
  };
}

document.addEventListener("keydown", event => {
  if (state.activeOps !== "multiterm" || !multiDock) return;
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (!event.code.startsWith("Digit")) return;
  const digit = Number(event.code.slice(5));
  const index = digit === 0 ? 9 : digit - 1;
  const panel = multiDock.panels[index];
  if (!panel) return;
  event.preventDefault();
  event.stopPropagation();
  panel.api.setActive();
}, true);

function startNewServer() {
  state.draftNew = true;
  setSelectedId(null);
  setActiveOps("settings");
  state.addMenuOpen = false;
  state.groupCreateOpen = false;
  render();
  elements.serverHost.focus();
}

function startNewGroup() {
  state.addMenuOpen = false;
  state.groupCreateOpen = true;
  state.serverRailCollapsed = false;
  render();
  elements.groupNameInput.focus();
}

elements.newServerButton.addEventListener("click", event => {
  event.stopPropagation();
  state.addMenuOpen = !state.addMenuOpen;
  state.serverRailCollapsed = false;
  render();
});

elements.createMenu.addEventListener("click", event => {
  event.stopPropagation();
});

elements.newServerMenuButton.addEventListener("click", () => guardUnsaved(startNewServer));
elements.newGroupMenuButton.addEventListener("click", () => guardUnsaved(startNewGroup));

document.addEventListener("click", event => {
  if (state.addMenuOpen && !elements.createMenu.contains(event.target) && event.target !== elements.newServerButton) {
    state.addMenuOpen = false;
    renderList();
  }
  if (state.serverMenuOpenId && !event.target.closest(".server-row-menu") && !event.target.closest(".server-kebab")) {
    state.serverMenuOpenId = null;
    renderList();
  }
});

elements.collapseServerRailButton.addEventListener("click", () => {
  state.serverRailCollapsed = !state.serverRailCollapsed;
  writeStoredValue(STORAGE_KEYS.railCollapsed, state.serverRailCollapsed ? "1" : "");
  state.addMenuOpen = false;
  if (state.serverRailCollapsed) {
    state.groupCreateOpen = false;
  }
  render();
});

elements.collapseNavButton.addEventListener("click", () => {
  state.featureNavCollapsed = !state.featureNavCollapsed;
  writeStoredValue(STORAGE_KEYS.navCollapsed, state.featureNavCollapsed ? "1" : "");
  render();
});

elements.createGroupButton.addEventListener("click", createGroup);
elements.groupNameInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    createGroup();
  } else if (event.key === "Escape") {
    state.groupCreateOpen = false;
    render();
  }
});

elements.serverSearch.addEventListener("input", renderList);
elements.saveServerButton.addEventListener("click", saveServer);
elements.deleteServerButton.addEventListener("click", deleteServer);
elements.openTerminalButton.addEventListener("click", openTerminal);

elements.uploadKeyButton.addEventListener("click", openKeyUpload);
elements.openKeyFolderButton.addEventListener("click", () => guardUnsaved(openKeyFolder));
elements.keyUploadCancel.addEventListener("click", closeKeyUpload);
elements.keyUploadConfirm.addEventListener("click", confirmKeyUpload);
elements.keyUploadOverlay.addEventListener("click", event => {
  if (event.target === elements.keyUploadOverlay) closeKeyUpload();
});

elements.unsavedSave.addEventListener("click", async () => {
  // Saving repopulates the form (clearing the dirty state); only then navigate.
  if (await saveServer()) runPendingNavigation();
  else elements.unsavedOverlay.hidden = true;
});
elements.unsavedDiscard.addEventListener("click", () => {
  // Mark clean so the pending navigation's re-render reloads the form fresh,
  // dropping the edits.
  state.settingsBaseline = settingsSnapshot();
  runPendingNavigation();
});
elements.unsavedCancel.addEventListener("click", closeUnsavedDialog);
elements.unsavedOverlay.addEventListener("click", event => {
  if (event.target === elements.unsavedOverlay) closeUnsavedDialog();
});

// Warn before a full page unload (tab close / reload) if edits are pending.
window.addEventListener("beforeunload", event => {
  if (isSettingsDirty()) {
    event.preventDefault();
    event.returnValue = "";
  }
});

elements.serverForm.addEventListener("submit", event => {
  event.preventDefault();
  saveServer();
});

elements.copyInstallButton.addEventListener("click", async () => {
  const text = elements.installCommand.textContent;
  await copyText(text);
  showToast("Install command copied.");
});

elements.authForm.addEventListener("submit", submitAuth);

boot().catch(error => {
  showToast(error.message);
});

window.setInterval(() => {
  // Skip the periodic refresh while editing settings — reloading would
  // overwrite the in-progress form.
  if (state.authStatus?.authenticated && elements.authOverlay.hidden && !isSettingsDirty()) {
    load().catch(() => {});
  }
}, 60000);
