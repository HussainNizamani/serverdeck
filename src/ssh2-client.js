const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Client } = require("ssh2");
const { resolveIdentity } = require("./ssh");

const DEFAULT_KEY_NAMES = ["id_ed25519", "id_ecdsa", "id_rsa"];

function defaultPrivateKey() {
  for (const name of DEFAULT_KEY_NAMES) {
    const keyPath = path.join(os.homedir(), ".ssh", name);
    try {
      return fs.readFileSync(keyPath);
    } catch {
      // Try the next conventional key location.
    }
  }
  return null;
}

function connectionConfig(server) {
  const config = {
    host: server.host,
    port: Number(server.port || 22),
    username: server.user || "root",
    readyTimeout: 15000,
    keepaliveInterval: 30000,
    keepaliveCountMax: 3
  };

  if (server.keyPath) {
    const identity = resolveIdentity(server);
    if (identity.error) {
      identity.cleanup();
      throw new Error(identity.error);
    }
    // resolveIdentity returns ["-i", "<path>"]; read the key into memory and
    // clean up immediately so temporary PPK conversions never linger on disk.
    const keyFile = identity.args[1];
    try {
      config.privateKey = fs.readFileSync(keyFile);
    } finally {
      identity.cleanup();
    }
  } else {
    const fallbackKey = defaultPrivateKey();
    if (fallbackKey) config.privateKey = fallbackKey;
    if (process.env.SSH_AUTH_SOCK) config.agent = process.env.SSH_AUTH_SOCK;
    if (!config.privateKey && !config.agent) {
      throw new Error("No SSH key configured for this server and no default key or agent is available.");
    }
  }

  return config;
}

function connect(server) {
  return new Promise((resolve, reject) => {
    let config;
    try {
      config = connectionConfig(server);
    } catch (err) {
      reject(err);
      return;
    }
    const conn = new Client();
    conn.on("ready", () => resolve(conn));
    conn.on("error", err => reject(new Error(`SSH connection failed: ${err.message}`)));
    conn.connect(config);
  });
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
