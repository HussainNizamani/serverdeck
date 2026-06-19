const fs = require("node:fs");
const { Client } = require("ssh2");
const { resolveIdentity, splitKeyPaths } = require("./ssh");

function baseConfig(server) {
  return {
    host: server.host,
    port: Number(server.port || 22),
    username: server.user || "root",
    readyTimeout: 15000,
    keepaliveInterval: 30000,
    keepaliveCountMax: 3
  };
}

// Reads every selected key into memory. PPK keys are converted on the fly and
// their temp files removed immediately, so nothing lingers on disk.
function keyBuffers(server) {
  const buffers = [];
  const paths = splitKeyPaths(server.keyPath);
  let firstError = null;
  for (const keyPath of paths) {
    const identity = resolveIdentity({ keyPath });
    if (identity.error) {
      // Skip a missing/unresolvable key and try the rest.
      identity.cleanup();
      if (!firstError) firstError = identity.error;
      continue;
    }
    const keyFile = identity.args[1];
    if (!keyFile) {
      identity.cleanup();
      continue;
    }
    try {
      buffers.push(fs.readFileSync(keyFile));
    } finally {
      identity.cleanup();
    }
  }
  // Keys were selected but none resolved — surface that instead of failing later.
  if (paths.length && !buffers.length && firstError) throw new Error(firstError);
  return buffers;
}

function attemptConnect(config, onReady, onError) {
  const conn = new Client();
  conn.on("ready", () => onReady(conn));
  conn.on("error", onError);
  if (config.tryKeyboard) {
    // Some servers use keyboard-interactive instead of plain password auth;
    // answer every prompt with the configured password.
    conn.on("keyboard-interactive", (name, instructions, lang, prompts, finish) => {
      finish(prompts.map(() => config.password));
    });
  }
  conn.connect(config);
}

function connect(server) {
  return new Promise((resolve, reject) => {
    const base = baseConfig(server);
    const fail = err => reject(new Error(`SSH connection failed: ${err.message}`));

    // server.password is the already-decrypted plaintext, attached by the API
    // layer right before connecting. It is never stored on the server record.
    const password = String(server.password || "");
    if (password) {
      attemptConnect({ ...base, password, tryKeyboard: true }, resolve, fail);
      return;
    }

    let keys;
    try {
      keys = keyBuffers(server);
    } catch (err) {
      reject(err);
      return;
    }

    const agent = process.env.SSH_AUTH_SOCK || "";

    if (!keys.length) {
      if (agent) {
        attemptConnect({ ...base, agent }, resolve, fail);
        return;
      }
      reject(new Error("No SSH key or password configured for this server. Select a key in SSH Keys, set a password, or expose an SSH agent."));
      return;
    }

    // Try each selected key in turn, advancing only when the server rejects the
    // current key (authentication failure). Network-level errors stop the loop.
    let index = 0;
    const tryKey = () => {
      attemptConnect({ ...base, privateKey: keys[index] }, resolve, err => {
        const authFailed = Boolean(err) && err.level === "client-authentication";
        if (authFailed && index + 1 < keys.length) {
          index += 1;
          tryKey();
        } else if (authFailed && agent) {
          attemptConnect({ ...base, agent }, resolve, fail);
        } else {
          fail(err);
        }
      });
    };
    tryKey();
  });
}

function execCommand(conn, command, { timeoutMs = 45000 } = {}) {
  const startedAt = Date.now();
  return new Promise(resolve => {
    conn.exec(command, (err, stream) => {
      if (err) {
        resolve({ stdout: "", stderr: err.message, exitCode: null, signal: null, timedOut: false, durationMs: Date.now() - startedAt });
        return;
      }
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        stream.close();
      }, timeoutMs);

      stream.on("data", chunk => {
        stdout += chunk.toString("utf8");
        if (stdout.length > 300000) stdout = stdout.slice(-240000);
      });
      stream.stderr.on("data", chunk => {
        stderr += chunk.toString("utf8");
        if (stderr.length > 120000) stderr = stderr.slice(-90000);
      });
      stream.on("close", (code, signal) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          exitCode: code ?? null,
          signal: signal ?? null,
          timedOut,
          durationMs: Date.now() - startedAt
        });
      });
    });
  });
}

// Same result shape as ssh.js runSsh, but over the ssh2 library — used for
// password-authenticated servers, where the openssh binary cannot be fed a
// password non-interactively.
async function runSsh2(server, command, options = {}) {
  const startedAt = Date.now();
  let conn;
  try {
    conn = await connect(server);
  } catch (err) {
    return { stdout: "", stderr: err.message, exitCode: null, signal: null, timedOut: false, durationMs: Date.now() - startedAt };
  }
  try {
    return await execCommand(conn, command, options);
  } finally {
    conn.end();
  }
}

function openShell(conn, { cols = 80, rows = 24 } = {}) {
  return new Promise((resolve, reject) => {
    conn.shell({ term: "xterm-256color", cols, rows }, (err, stream) => {
      if (err) reject(new Error(`Failed to open shell: ${err.message}`));
      else resolve(stream);
    });
  });
}

function openSftp(conn) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) reject(new Error(`Failed to open SFTP session: ${err.message}`));
      else resolve(sftp);
    });
  });
}

async function withSftp(server, fn) {
  const conn = await connect(server);
  try {
    const sftp = await openSftp(conn);
    return await fn(sftp);
  } finally {
    conn.end();
  }
}

function sftpReaddir(sftp, dirPath) {
  return new Promise((resolve, reject) => {
    sftp.readdir(dirPath, (err, list) => {
      if (err) reject(new Error(`Could not list ${dirPath}: ${err.message}`));
      else resolve(list);
    });
  });
}

function sftpStat(sftp, filePath) {
  return new Promise((resolve, reject) => {
    sftp.stat(filePath, (err, stats) => {
      if (err) reject(new Error(`Could not stat ${filePath}: ${err.message}`));
      else resolve(stats);
    });
  });
}

function sftpMkdir(sftp, dirPath) {
  return new Promise((resolve, reject) => {
    sftp.mkdir(dirPath, err => {
      if (err) reject(new Error(`Could not create ${dirPath}: ${err.message}`));
      else resolve();
    });
  });
}

function sftpRename(sftp, fromPath, toPath) {
  return new Promise((resolve, reject) => {
    sftp.rename(fromPath, toPath, err => {
      if (err) reject(new Error(`Could not rename ${fromPath}: ${err.message}`));
      else resolve();
    });
  });
}

function sftpDelete(sftp, targetPath, isDirectory) {
  return new Promise((resolve, reject) => {
    const done = err => {
      if (err) reject(new Error(`Could not delete ${targetPath}: ${err.message}`));
      else resolve();
    };
    if (isDirectory) sftp.rmdir(targetPath, done);
    else sftp.unlink(targetPath, done);
  });
}

module.exports = {
  runSsh2,
  connect,
  openShell,
  openSftp,
  withSftp,
  sftpReaddir,
  sftpStat,
  sftpMkdir,
  sftpRename,
  sftpDelete
};
