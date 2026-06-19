const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

function noop() {}

function expandHome(filePath) {
  const trimmed = String(filePath || "").trim().replace(/^(['"])(.*)\1$/, "$2").trim();
  if (!trimmed) return "";
  if (trimmed === "~") return os.homedir();
  if (trimmed.startsWith("~/")) return path.join(os.homedir(), trimmed.slice(2));
  return trimmed;
}

// A server may reference several keys. They are stored in the single keyPath
// field, newline-separated, so storage stays a plain string.
function splitKeyPaths(keyPath) {
  return String(keyPath || "")
    .split("\n")
    .map(entry => entry.trim())
    .filter(Boolean);
}

function pathRemaps() {
  return String(process.env.SERVERDECK_KEY_PATH_REMAPS || "")
    .split(",")
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => {
      const separator = entry.indexOf("=");
      if (separator === -1) return null;
      return {
        from: entry.slice(0, separator).trim().replace(/\/+$/, ""),
        to: entry.slice(separator + 1).trim().replace(/\/+$/, "")
      };
    })
    .filter(entry => entry?.from && entry?.to);
}

function remapKeyPath(filePath) {
  for (const remap of pathRemaps()) {
    if (filePath === remap.from || filePath.startsWith(`${remap.from}/`)) {
      return `${remap.to}${filePath.slice(remap.from.length)}`;
    }
  }
  return filePath;
}

// Whether a bare filename is one the key discovery scan will surface. Shared
// with the upload handler so uploaded keys are guaranteed to be discoverable.
function looksLikeKeyFilename(base) {
  if (base.endsWith(".pub") || base === "known_hosts" || base === "authorized_keys" || base === "config") return false;
  if (/\.(pem|key|ppk)$/i.test(base)) return true;
  if (/^id_(rsa|ed25519|ecdsa|dsa)$/i.test(base)) return true;
  return false;
}

function looksLikePrivateKey(filePath, stat) {
  if (stat.isDirectory()) return false;
  return looksLikeKeyFilename(path.basename(filePath));
}

function listSshKeys() {
  const keys = [];
  const seen = new Set();

  function visit(dir, depth = 0) {
    if (depth > 2) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const filePath = path.join(dir, entry.name);
      let stat;
      try {
        stat = fs.statSync(filePath);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        visit(filePath, depth + 1);
        continue;
      }
      if (!looksLikePrivateKey(filePath, stat) || seen.has(filePath)) continue;
      seen.add(filePath);
      keys.push({
        path: filePath,
        name: entry.name,
        type: /\.ppk$/i.test(entry.name) ? "ppk" : "openssh",
        readable: true,
        modifiedAt: stat.mtime.toISOString(),
        size: stat.size
      });
    }
  }

  // Strictly one directory: the single shared keys folder. Nothing else (no
  // ~/.ssh, no extra search paths) is ever scanned.
  visit(keyUploadDir());

  return keys.sort((a, b) => a.path.localeCompare(b.path));
}

// THE keys directory — the one and only folder Server Deck reads keys from and
// writes uploads to. Shared host<->container via the bind mount. Permissions
// are enforced on the whole folder regardless of who created a file (see
// enforceKeyPerms). There is no second location.
function keyUploadDir() {
  return expandHome(process.env.SERVERDECK_KEY_UPLOAD_DIR || "/keys");
}

const RESERVED_KEY_NAMES = new Set(["config", "known_hosts", "authorized_keys"]);

// Reduces an uploaded filename to a single safe basename. Throws (statusCode
// 400) on traversal attempts, disallowed characters, or reserved/public-key
// names so callers can surface a clean error.
function sanitizeKeyName(rawName) {
  const base = path.basename(String(rawName || "").trim());
  if (!base || base === "." || base === "..") {
    throw Object.assign(new Error("A key filename is required."), { statusCode: 400 });
  }
  if (!/^[A-Za-z0-9._-]+$/.test(base)) {
    throw Object.assign(
      new Error("Key filename may only contain letters, numbers, dots, dashes and underscores."),
      { statusCode: 400 }
    );
  }
  if (base.endsWith(".pub") || RESERVED_KEY_NAMES.has(base)) {
    throw Object.assign(new Error(`"${base}" is not a private key filename.`), { statusCode: 400 });
  }
  return base;
}

// Confirms uploaded content is actually a private key (not an arbitrary text
// file) before it touches disk. Encrypted keys can't be parsed without their
// passphrase, so a valid PEM/OpenSSH envelope is accepted even when parsing
// fails for a passphrase reason.
function validatePrivateKey(content) {
  const text = String(content || "").trim();
  if (!text) return { ok: false, reason: "The uploaded file is empty." };
  if (/^PuTTY-User-Key-File-/m.test(text)) return { ok: true, type: "ppk" };

  const hasEnvelope =
    /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/.test(text) &&
    /-----END [A-Z0-9 ]*PRIVATE KEY-----/.test(text);
  if (!hasEnvelope) {
    return { ok: false, reason: "Not a recognized private key (missing a PEM/OpenSSH header)." };
  }

  try {
    crypto.createPrivateKey(text);
    return { ok: true, type: "openssh" };
  } catch (err) {
    const passphraseProtected =
      err.code === "ERR_MISSING_PASSPHRASE" ||
      /passphrase|bad decrypt/i.test(err.message || "") ||
      /ENCRYPTED/.test(text) ||
      /-----BEGIN OPENSSH PRIVATE KEY-----/.test(text);
    if (passphraseProtected) return { ok: true, type: "openssh", encrypted: true };
    return { ok: false, reason: "The file looks like a key but could not be parsed." };
  }
}

// Locks down the key folder: 0700 on the directory, 0600 on every private key
// inside it. Best-effort — a file the process cannot chmod (wrong owner) is
// skipped rather than failing the whole sweep. Run after every upload/delete.
function enforceKeyPerms(dir = keyUploadDir()) {
  try {
    fs.chmodSync(dir, 0o700);
  } catch {
    // Directory may not exist yet or may be owned by another user.
  }
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.isFile() || entry.name.endsWith(".pub")) continue;
    try {
      fs.chmodSync(path.join(dir, entry.name), 0o600);
    } catch {
      // Best effort — skip files this process does not own.
    }
  }
}

// Where the host keeps the keys folder, so a fix command points at the path the
// user actually runs chown/chmod on (the container only sees /keys).
function keyHostPath(containerPath) {
  const dir = keyUploadDir();
  const hostDir = process.env.SERVERDECK_KEY_HOST_DIR || dir;
  if (containerPath === dir) return hostDir;
  if (containerPath.startsWith(`${dir}/`)) return `${hostDir}${containerPath.slice(dir.length)}`;
  return containerPath;
}

// Reports whether Server Deck can actually use a key on disk and, when it
// can't, the exact command to fix it. Reading a 0600 key requires ownership;
// the OpenSSH binary additionally refuses group/world-readable keys. Keys we
// own that are too open are tightened automatically ("adjust accordingly").
// Statuses: none | ok | secured | too_open | unreadable | unreachable.
function keyAccess(rawPath) {
  const raw = String(rawPath || "").trim();
  if (!raw) return { status: "none" };

  const requested = expandHome(raw);
  const resolved = fs.existsSync(requested) ? requested : remapKeyPath(requested);
  if (!fs.existsSync(resolved)) {
    return {
      status: "unreachable",
      message: "Server Deck can't see this path. Put the key in the keys folder, or mount its folder into the container."
    };
  }

  const uid = typeof process.getuid === "function" ? process.getuid() : null;
  const gid = typeof process.getgid === "function" ? process.getgid() : null;
  const hostPath = keyHostPath(resolved);
  const chownCmd = uid !== null
    ? `sudo chown ${uid}:${gid} ${hostPath} && chmod 600 ${hostPath}`
    : `chmod 600 ${hostPath}`;

  let readable = true;
  try {
    fs.accessSync(resolved, fs.constants.R_OK);
  } catch {
    readable = false;
  }
  if (!readable) {
    return {
      status: "unreadable",
      message: "Server Deck can't read this key — it's owned by another user. Hand it over with:",
      command: chownCmd
    };
  }

  // PPK keys are converted to a fresh 0600 temp before use, so their on-disk
  // mode is irrelevant — being readable is enough.
  if (/\.ppk$/i.test(resolved)) return { status: "ok" };

  let stat;
  try {
    stat = fs.statSync(resolved);
  } catch {
    return { status: "ok" };
  }
  if ((stat.mode & 0o077) !== 0) {
    const ownedByUs = uid !== null && stat.uid === uid;
    if (ownedByUs) {
      try {
        fs.chmodSync(resolved, 0o600);
        return { status: "secured" };
      } catch {
        // fall through to the command hint
      }
    }
    return {
      status: "too_open",
      message: "This key is readable by other users; SSH will refuse it. Lock it down with:",
      command: ownedByUs ? `chmod 600 ${hostPath}` : chownCmd
    };
  }
  return { status: "ok" };
}

function hasPuttygen() {
  const result = spawnSync("puttygen", ["--version"], {
    encoding: "utf8",
    timeout: 3000
  });
  return !result.error && result.status === 0;
}

function cleanupDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Best effort cleanup for converted private keys.
  }
}

function resolveIdentity(server) {
  const rawKeyPath = String(server.keyPath || "").trim();
  if (!rawKeyPath) {
    return { args: [], cleanup: noop, keyPath: "" };
  }

  const requestedKeyPath = expandHome(rawKeyPath);
  const keyPath = fs.existsSync(requestedKeyPath) ? requestedKeyPath : remapKeyPath(requestedKeyPath);
  if (!fs.existsSync(keyPath)) {
    return {
      args: [],
      cleanup: noop,
      keyPath,
      error: requestedKeyPath === keyPath
        ? `SSH key was not found: ${keyPath}`
        : `SSH key was not found: ${requestedKeyPath} (also tried ${keyPath})`
    };
  }

  if (!/\.ppk$/i.test(keyPath)) {
    return { args: ["-i", keyPath], cleanup: noop, keyPath };
  }

  if (!hasPuttygen()) {
    return {
      args: [],
      cleanup: noop,
      keyPath,
      error: "PPK keys require puttygen on the Server Deck machine. Install putty-tools/putty, or convert the key to OpenSSH format."
    };
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "serverdeck-ppk-"));
  const convertedKey = path.join(tempDir, "identity");
  const result = spawnSync("puttygen", [keyPath, "-O", "private-openssh", "-o", convertedKey], {
    encoding: "utf8",
    timeout: 10000,
    input: "\n"
  });

  if (result.status !== 0 || result.error) {
    cleanupDir(tempDir);
    const detail = result.error?.message || result.stderr || result.stdout || "puttygen failed";
    return {
      args: [],
      cleanup: noop,
      keyPath,
      error: `PPK conversion failed: ${String(detail).trim()}`
    };
  }

  fs.chmodSync(convertedKey, 0o600);
  return {
    args: ["-i", convertedKey],
    cleanup: () => cleanupDir(tempDir),
    keyPath
  };
}

// Resolves every key path on a server into combined ssh `-i` arguments, with a
// single cleanup that tears down any temporary PPK conversions.
function resolveIdentities(server) {
  const paths = splitKeyPaths(server.keyPath);
  if (!paths.length) return { args: [], cleanup: noop };

  const args = [];
  const cleanups = [];
  let firstError = null;
  const cleanup = () => cleanups.forEach(fn => fn());
  for (const keyPath of paths) {
    const identity = resolveIdentity({ keyPath });
    if (identity.error) {
      // Skip a missing/unresolvable key and try the rest — a stale or moved key
      // must not take down a connection that has other valid keys.
      identity.cleanup();
      if (!firstError) firstError = identity.error;
      continue;
    }
    args.push(...identity.args);
    cleanups.push(identity.cleanup);
  }
  if (!args.length) {
    cleanup();
    return { args: [], cleanup: noop, error: firstError || "No usable SSH key was found" };
  }
  return { args, cleanup };
}

function buildSshArgs(server, options = {}) {
  const identity = resolveIdentities(server);
  if (identity.error) {
    return { args: [], cleanup: identity.cleanup, error: identity.error };
  }

  const userAtHost = server.user ? `${server.user}@${server.host}` : server.host;
  const args = [
    options.terminal ? "-tt" : "-T",
    "-o", "ServerAliveInterval=30",
    "-o", "ServerAliveCountMax=3",
    "-o", "StrictHostKeyChecking=accept-new"
  ];

  if (options.batch !== false) {
    args.push("-o", "BatchMode=yes", "-o", `ConnectTimeout=${Number(options.connectTimeoutSeconds || 10)}`);
  }

  args.push(...identity.args, "-p", String(server.port || 22), userAtHost);

  if (options.command) {
    args.push(options.command);
  }

  return { args, cleanup: identity.cleanup };
}

function spawnSsh(server, options = {}) {
  const prepared = buildSshArgs(server, options);
  if (prepared.error) {
    return { error: prepared.error, cleanup: prepared.cleanup };
  }

  const child = spawn("ssh", prepared.args, {
    env: { ...process.env, TERM: options.terminal ? "xterm-256color" : "dumb" },
    stdio: ["pipe", "pipe", "pipe"]
  });

  return { child, cleanup: prepared.cleanup, args: prepared.args };
}

function runSsh(server, command, options = {}) {
  const startedAt = Date.now();
  const prepared = spawnSsh(server, {
    command,
    terminal: false,
    batch: options.batch !== false,
    connectTimeoutSeconds: options.connectTimeoutSeconds || 10
  });

  if (prepared.error) {
    return Promise.resolve({
      stdout: "",
      stderr: prepared.error,
      exitCode: null,
      signal: null,
      timedOut: false,
      durationMs: Date.now() - startedAt
    });
  }

  const { child, cleanup } = prepared;
  const timeoutMs = Number(options.timeoutMs || 30000);

  return new Promise(resolve => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", chunk => {
      stdout += chunk.toString("utf8");
      if (stdout.length > 300000) stdout = stdout.slice(-240000);
    });

    child.stderr.on("data", chunk => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 120000) stderr = stderr.slice(-90000);
    });

    child.on("error", err => {
      stderr += err.message;
    });

    child.on("close", (exitCode, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      resolve({
        stdout,
        stderr,
        exitCode,
        signal,
        timedOut,
        durationMs: Date.now() - startedAt
      });
    });
  });
}

module.exports = {
  buildSshArgs,
  enforceKeyPerms,
  expandHome,
  hasPuttygen,
  keyAccess,
  keyUploadDir,
  listSshKeys,
  looksLikeKeyFilename,
  remapKeyPath,
  resolveIdentity,
  resolveIdentities,
  runSsh,
  sanitizeKeyName,
  splitKeyPaths,
  spawnSsh,
  validatePrivateKey
};
