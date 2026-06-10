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

function keySearchDirs() {
  const configured = String(process.env.SERVERDECK_KEY_DIRS || "")
    .split(":")
    .map(entry => entry.trim())
    .filter(Boolean);
  const remappedTargets = pathRemaps().map(remap => remap.to);
  const defaults = [path.join(os.homedir(), ".ssh"), "/keys"];
  return [...new Set([...configured, ...remappedTargets, ...defaults].map(expandHome))];
}

function looksLikePrivateKey(filePath, stat) {
  const base = path.basename(filePath);
  if (stat.isDirectory()) return false;
  if (base.endsWith(".pub") || base === "known_hosts" || base === "authorized_keys" || base === "config") return false;
  if (/\.(pem|key|ppk)$/i.test(base)) return true;
  if (/^id_(rsa|ed25519|ecdsa|dsa)$/i.test(base)) return true;
  return false;
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

  for (const dir of keySearchDirs()) {
    visit(dir);
  }

  return keys.sort((a, b) => a.path.localeCompare(b.path));
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

function buildSshArgs(server, options = {}) {
  const identity = resolveIdentity(server);
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
  expandHome,
  hasPuttygen,
  listSshKeys,
  remapKeyPath,
  resolveIdentity,
  runSsh,
  spawnSsh
};
