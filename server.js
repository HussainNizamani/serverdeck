const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { createStore } = require("./src/store");
const { createPostgresStore } = require("./src/postgres-store");
const { hasPuttygen, listSshKeys } = require("./src/ssh");
const ssh2 = require("./src/ssh2-client");
const { TASKS, runServerTask } = require("./src/tasks");
const { acceptWebSocket } = require("./src/ws");
const { createAuth, parseAllowedNetworks, isIpAllowed, DEFAULT_ALLOW_NETWORKS } = require("./src/auth");

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const AGENT_DIR = path.join(ROOT, "agent");
const DATA_DIR = process.env.SERVERDECK_DATA_DIR || path.join(ROOT, "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const HOST = process.env.HOST || process.env.SERVERDECK_HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || process.env.SERVERDECK_PORT || 8787);
const DATABASE_URL = process.env.DATABASE_URL || process.env.SERVERDECK_DATABASE_URL || "";
const STORAGE_PROVIDER = DATABASE_URL ? "postgres" : "json";
const VERSION = require("./package.json").version;

const store = DATABASE_URL
  ? createPostgresStore({ connectionString: DATABASE_URL })
  : createStore(STATE_FILE);

const auth = createAuth(store);
const ALLOWED_NETWORKS = parseAllowedNetworks(process.env.SERVERDECK_ALLOW_NETWORKS || DEFAULT_ALLOW_NETWORKS);

function connectionAllowed(req) {
  return isIpAllowed(req.socket.remoteAddress, ALLOWED_NETWORKS);
}

function sessionCookie(token) {
  const maxAge = 60 * 60 * 24 * 30;
  return `serverdeck_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

const CLEAR_SESSION_COOKIE = "serverdeck_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";

// Frontend terminal assets served from node_modules (xterm.js — the terminal
// library used by VS Code).
const VENDOR_FILES = {
  "/vendor/xterm.js": path.join(ROOT, "node_modules", "@xterm", "xterm", "lib", "xterm.js"),
  "/vendor/xterm.css": path.join(ROOT, "node_modules", "@xterm", "xterm", "css", "xterm.css"),
  "/vendor/addon-fit.js": path.join(ROOT, "node_modules", "@xterm", "addon-fit", "lib", "addon-fit.js")
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".sh": "text/x-shellscript; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store"
  });
  res.end(payload);
}

function sendText(res, status, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(text),
    "Cache-Control": "no-store"
  });
  res.end(text);
}

function readBody(req, limitBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", chunk => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(Object.assign(new Error("Request body too large"), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function readJson(req, limitBytes = 1024 * 1024) {
  const raw = await readBody(req, limitBytes);
  if (!raw.trim()) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    const err = new Error("Invalid JSON body");
    err.statusCode = 400;
    throw err;
  }
}

function safeFileFrom(baseDir, requestPath) {
  const normalized = path.normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(baseDir, normalized);
  const relative = path.relative(baseDir, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return filePath;
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      sendText(res, err.code === "ENOENT" ? 404 : 500, err.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Content-Length": content.length,
      "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=60"
    });
    res.end(content);
  });
}

function parseServerIdFromPath(pathname, prefix, suffix = "") {
  if (!pathname.startsWith(prefix) || (suffix && !pathname.endsWith(suffix))) {
    return null;
  }
  const withoutPrefix = pathname.slice(prefix.length);
  const raw = suffix ? withoutPrefix.slice(0, -suffix.length) : withoutPrefix;
  const id = raw.split("/")[0];
  return id || null;
}

function validateAgentToken(server, req, body, url) {
  const provided = req.headers["x-serverdeck-token"] || url.searchParams.get("token") || body.token;
  if (!provided || provided !== server.agentToken) {
    return false;
  }
  return true;
}

async function handleAuthApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/auth/status") {
    sendJson(res, 200, await auth.status(req));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/setup") {
    const body = await readJson(req);
    await auth.setup(body);
    const login = await auth.login({
      ...body,
      ip: req.socket.remoteAddress,
      userAgent: req.headers["user-agent"]
    });
    res.setHeader("Set-Cookie", sessionCookie(login.token));
    sendJson(res, 201, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readJson(req);
    try {
      const login = await auth.login({
        ...body,
        ip: req.socket.remoteAddress,
        userAgent: req.headers["user-agent"]
      });
      res.setHeader("Set-Cookie", sessionCookie(login.token));
      sendJson(res, 200, { ok: true });
    } catch (err) {
      sendJson(res, err.statusCode || 500, { error: err.message, totpRequired: Boolean(err.totpRequired) });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    await auth.logout(req);
    res.setHeader("Set-Cookie", CLEAR_SESSION_COOKIE);
    sendJson(res, 200, { ok: true });
    return;
  }

  // Everything below requires an authenticated session.
  const session = await auth.sessionFromRequest(req);
  if (!session) {
    sendJson(res, 401, { error: "Not signed in" });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/sessions") {
    sendJson(res, 200, { sessions: await auth.listSessions(req) });
    return;
  }

  const sessionId = parseServerIdFromPath(url.pathname, "/api/auth/sessions/");
  if (req.method === "DELETE" && sessionId) {
    const revoked = await auth.revokeSession(sessionId);
    sendJson(res, revoked ? 200 : 404, revoked ? { ok: true } : { error: "Session not found" });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/password") {
    const body = await readJson(req);
    sendJson(res, 200, await auth.changePassword(body));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/totp/init") {
    sendJson(res, 200, await auth.totpInit());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/totp/enable") {
    const body = await readJson(req);
    sendJson(res, 200, await auth.totpEnable(body));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/totp/disable") {
    const body = await readJson(req);
    sendJson(res, 200, await auth.totpDisable(body));
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

function isPublicApiPath(req, url) {
  if (url.pathname === "/api/health") return true;
  if (url.pathname.startsWith("/api/auth/")) return true;
  // Agent reports authenticate with their own per-server token.
  if (req.method === "POST" && url.pathname.startsWith("/api/agent/") && url.pathname.endsWith("/report")) return true;
  return false;
}

async function handleApi(req, res, url) {
  try {
    if (url.pathname.startsWith("/api/auth/")) {
      await handleAuthApi(req, res, url);
      return;
    }

    if (!isPublicApiPath(req, url)) {
      const session = await auth.sessionFromRequest(req);
      if (!session) {
        sendJson(res, 401, { error: "Not signed in" });
        return;
      }
    }

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, { ok: true, version: VERSION });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/config") {
      sendJson(res, 200, {
        version: VERSION,
        agentScriptPath: "/agent/serverdeck-agent.sh",
        installScriptPath: "/agent/install.sh",
        supportedTasks: TASKS,
        ppkSupport: {
          enabled: hasPuttygen(),
          requirement: "Install putty-tools/putty on the Server Deck machine to use .ppk keys."
        },
        bind: HOST,
        port: PORT,
        storage: {
          provider: STORAGE_PROVIDER,
          history: "Task refreshes and agent reports are persisted with timestamps."
        }
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/ssh-keys") {
      sendJson(res, 200, {
        keys: listSshKeys(),
        defaultLocations: ["~/.ssh", "/keys"]
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/servers") {
      sendJson(res, 200, { servers: await store.listServers() });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/groups") {
      sendJson(res, 200, { groups: await store.listGroups() });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/groups") {
      const body = await readJson(req);
      const group = await store.createGroup(body);
      sendJson(res, 201, { group });
      return;
    }

    const groupId = parseServerIdFromPath(url.pathname, "/api/groups/");
    if (groupId) {
      if (req.method === "PUT" && url.pathname === `/api/groups/${groupId}`) {
        const body = await readJson(req);
        const group = await store.updateGroup(groupId, body);
        if (!group) {
          sendJson(res, 404, { error: "Group not found" });
          return;
        }
        sendJson(res, 200, { group });
        return;
      }

      if (req.method === "DELETE" && url.pathname === `/api/groups/${groupId}`) {
        const deleted = await store.deleteGroup(groupId);
        sendJson(res, deleted ? 200 : 404, deleted ? { ok: true } : { error: "Group not found" });
        return;
      }
    }

    if (req.method === "POST" && url.pathname === "/api/servers") {
      const body = await readJson(req);
      const server = await store.createServer(body);
      sendJson(res, 201, { server });
      return;
    }

    const serverId = parseServerIdFromPath(url.pathname, "/api/servers/");
    if (serverId) {
      if (req.method === "PUT" && url.pathname === `/api/servers/${serverId}`) {
        const body = await readJson(req);
        const server = await store.updateServer(serverId, body);
        if (!server) {
          sendJson(res, 404, { error: "Server not found" });
          return;
        }
        sendJson(res, 200, { server });
        return;
      }

      if (req.method === "DELETE" && url.pathname === `/api/servers/${serverId}`) {
        const deleted = await store.deleteServer(serverId);
        sendJson(res, deleted ? 200 : 404, deleted ? { ok: true } : { error: "Server not found" });
        return;
      }

      if (req.method === "GET" && url.pathname === `/api/servers/${serverId}/task-history`) {
        const history = await store.listTaskHistory(serverId, url.searchParams.get("task"));
        if (!history) {
          sendJson(res, 404, { error: "Server not found" });
          return;
        }
        sendJson(res, 200, { history });
        return;
      }
    }

    const sftpMatch = url.pathname.match(/^\/api\/servers\/([^/]+)\/sftp\/(list|download|upload|mkdir|rename|delete)$/);
    if (sftpMatch) {
      await handleSftpApi(req, res, url, sftpMatch[1], sftpMatch[2]);
      return;
    }

    const taskServerId = parseServerIdFromPath(url.pathname, "/api/servers/", "/task");
    if (req.method === "POST" && taskServerId) {
      const server = await store.getServer(taskServerId);
      if (!server) {
        sendJson(res, 404, { error: "Server not found" });
        return;
      }
      const body = await readJson(req, 128 * 1024);
      const result = await runServerTask(server, body);
      const outputTask = TASKS.includes(String(body.outputTask || "")) ? String(body.outputTask) : result.task;
      const historyEntry = await store.recordTaskRun(taskServerId, {
        task: outputTask,
        actionTask: result.task,
        input: body,
        status: result.exitCode === 0 && !result.timedOut ? "ok" : "warn",
        ...result
      });
      sendJson(res, 200, {
        ...result,
        historyEntry,
        server: await store.getServer(taskServerId)
      });
      return;
    }

    const reportServerId = parseServerIdFromPath(url.pathname, "/api/agent/", "/report");
    if (req.method === "POST" && reportServerId) {
      const server = await store.getServer(reportServerId);
      if (!server) {
        sendJson(res, 404, { error: "Server not found" });
        return;
      }
      const body = await readJson(req, 256 * 1024);
      if (!validateAgentToken(server, req, body, url)) {
        sendJson(res, 401, { error: "Invalid agent token" });
        return;
      }
      const report = await store.recordReport(reportServerId, body);
      sendJson(res, 202, { ok: true, reportId: report.id });
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    sendJson(res, err.statusCode || 500, { error: err.message || "Server error" });
  }
}

async function handleTerminalUpgrade(req, socket, url) {
  const session = await auth.sessionFromRequest(req);
  if (!session) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  const serverId = url.searchParams.get("serverId");
  const server = serverId ? await store.getServer(serverId) : null;
  if (!server) {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }

  const peer = acceptWebSocket(req, socket);
  if (!peer) return;

  const cols = Math.max(20, Math.min(500, Number(url.searchParams.get("cols")) || 80));
  const rows = Math.max(5, Math.min(300, Number(url.searchParams.get("rows")) || 24));

  peer.sendJson({ type: "status", data: `Connecting to ${server.name || server.host}...\r\n` });

  let conn = null;
  try {
    conn = await ssh2.connect(server);
    const stream = await ssh2.openShell(conn, { cols, rows });

    stream.on("data", chunk => peer.sendJson({ type: "output", data: chunk.toString("utf8") }));
    stream.stderr.on("data", chunk => peer.sendJson({ type: "output", data: chunk.toString("utf8") }));
    stream.on("close", () => {
      peer.sendJson({ type: "status", data: "\r\nConnection closed.\r\n" });
      conn.end();
      peer.close();
    });

    peer.onMessage(message => {
      let event;
      try {
        event = JSON.parse(message);
      } catch {
        return;
      }
      if (event.type === "input" && typeof event.data === "string") {
        stream.write(event.data);
      } else if (event.type === "resize") {
        const nextCols = Math.max(20, Math.min(500, Number(event.cols) || cols));
        const nextRows = Math.max(5, Math.min(300, Number(event.rows) || rows));
        stream.setWindow(nextRows, nextCols, 0, 0);
      }
    });

    peer.onClose(() => conn.end());
  } catch (err) {
    peer.sendJson({ type: "status", data: `${err.message}\r\n` });
    conn?.end();
    peer.close();
  }
}

/* ---------- SFTP file manager API ---------- */

function cleanRemotePath(value) {
  const raw = String(value || "/").trim() || "/";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

async function handleSftpApi(req, res, url, serverId, op) {
  const server = await store.getServer(serverId);
  if (!server) {
    sendJson(res, 404, { error: "Server not found" });
    return;
  }

  if (op === "list" && req.method === "GET") {
    const dirPath = cleanRemotePath(url.searchParams.get("path"));
    const entries = await ssh2.withSftp(server, sftp => ssh2.sftpReaddir(sftp, dirPath));
    const mapped = entries.map(entry => {
      const isDir = entry.attrs && typeof entry.attrs.isDirectory === "function"
        ? entry.attrs.isDirectory()
        : String(entry.longname || "").startsWith("d");
      return {
        name: entry.filename,
        size: entry.attrs?.size ?? 0,
        modifiedAt: entry.attrs?.mtime ? new Date(entry.attrs.mtime * 1000).toISOString() : null,
        isDir,
        isLink: String(entry.longname || "").startsWith("l")
      };
    }).sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name));
    sendJson(res, 200, { path: dirPath, entries: mapped });
    return;
  }

  if (op === "download" && req.method === "GET") {
    const filePath = cleanRemotePath(url.searchParams.get("path"));
    const conn = await ssh2.connect(server);
    try {
      const sftp = await ssh2.openSftp(conn);
      const stats = await ssh2.sftpStat(sftp, filePath);
      if (stats.isDirectory()) {
        conn.end();
        sendJson(res, 400, { error: "Cannot download a directory" });
        return;
      }
      const fileName = filePath.split("/").pop() || "download";
      res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Length": stats.size,
        "Content-Disposition": `attachment; filename="${fileName.replace(/["\\]/g, "_")}"`,
        "Cache-Control": "no-store"
      });
      const stream = sftp.createReadStream(filePath);
      stream.on("error", () => res.destroy());
      stream.on("close", () => conn.end());
      res.on("close", () => conn.end());
      stream.pipe(res);
    } catch (err) {
      conn.end();
      throw err;
    }
    return;
  }

  if (op === "upload" && req.method === "POST") {
    const filePath = cleanRemotePath(url.searchParams.get("path"));
    const conn = await ssh2.connect(server);
    try {
      const sftp = await ssh2.openSftp(conn);
      await new Promise((resolve, reject) => {
        const stream = sftp.createWriteStream(filePath);
        stream.on("error", err => reject(new Error(`Upload failed: ${err.message}`)));
        stream.on("close", resolve);
        req.on("error", reject);
        req.pipe(stream);
      });
      sendJson(res, 201, { ok: true, path: filePath });
    } finally {
      conn.end();
    }
    return;
  }

  if (op === "mkdir" && req.method === "POST") {
    const body = await readJson(req);
    const dirPath = cleanRemotePath(body.path);
    await ssh2.withSftp(server, sftp => ssh2.sftpMkdir(sftp, dirPath));
    sendJson(res, 201, { ok: true, path: dirPath });
    return;
  }

  if (op === "rename" && req.method === "POST") {
    const body = await readJson(req);
    await ssh2.withSftp(server, sftp => ssh2.sftpRename(sftp, cleanRemotePath(body.from), cleanRemotePath(body.to)));
    sendJson(res, 200, { ok: true });
    return;
  }

  if (op === "delete" && req.method === "POST") {
    const body = await readJson(req);
    await ssh2.withSftp(server, sftp => ssh2.sftpDelete(sftp, cleanRemotePath(body.path), Boolean(body.isDir)));
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

const server = http.createServer((req, res) => {
  if (!connectionAllowed(req)) {
    sendText(res, 403, "Forbidden: Server Deck only accepts connections from allowed networks (Tailscale or local).");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (VENDOR_FILES[url.pathname]) {
    serveFile(res, VENDOR_FILES[url.pathname]);
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    handleApi(req, res, url);
    return;
  }

  if (url.pathname.startsWith("/agent/")) {
    const filePath = safeFileFrom(AGENT_DIR, url.pathname.replace(/^\/agent\//, ""));
    if (!filePath) {
      sendText(res, 403, "Forbidden");
      return;
    }
    serveFile(res, filePath);
    return;
  }

  const requestPath = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\//, "");
  const filePath = safeFileFrom(PUBLIC_DIR, requestPath);
  if (!filePath) {
    sendText(res, 403, "Forbidden");
    return;
  }
  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isFile()) {
      serveFile(res, filePath);
      return;
    }
    serveFile(res, path.join(PUBLIC_DIR, "index.html"));
  });
});

server.on("upgrade", (req, socket) => {
  if (!connectionAllowed(req)) {
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    socket.destroy();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/ws/terminal") {
    handleTerminalUpgrade(req, socket, url).catch(err => {
      socket.write(`HTTP/1.1 500 Internal Server Error\r\n\r\n${err.message || "Server error"}`);
      socket.destroy();
    });
    return;
  }
  socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
  socket.destroy();
});

Promise.resolve(store.load()).then(() => {
  server.listen(PORT, HOST, () => {
    const displayHost = HOST === "0.0.0.0" ? "localhost" : HOST;
    console.log(`Server Deck running at http://${displayHost}:${PORT}`);
  });
}).catch(err => {
  console.error(err);
  process.exitCode = 1;
});
