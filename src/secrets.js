const crypto = require("node:crypto");

// Encrypts per-server SSH passwords at rest (AES-256-GCM).
//
// Key source, in order of preference:
//   1. SERVERDECK_SECRET env var — derived via HKDF. Keeps database dumps
//      un-decryptable without the secret.
//   2. A random key generated once and persisted in the settings store —
//      zero-config default; protects backups of the servers table alone but
//      not a full-database dump.
function createSecrets(store) {
  let cachedKey = null;

  async function key() {
    if (cachedKey) return cachedKey;
    const envSecret = process.env.SERVERDECK_SECRET || "";
    if (envSecret) {
      cachedKey = Buffer.from(crypto.hkdfSync("sha256", envSecret, "serverdeck", "password-encryption", 32));
      return cachedKey;
    }
    let stored = await store.getSetting("encryptionKey");
    if (typeof stored !== "string" || !/^[0-9a-f]{64}$/.test(stored)) {
      stored = crypto.randomBytes(32).toString("hex");
      await store.setSetting("encryptionKey", stored);
    }
    cachedKey = Buffer.from(stored, "hex");
    return cachedKey;
  }

  async function encrypt(plaintext) {
    if (!plaintext) return "";
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", await key(), iv);
    const data = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
    return `v1:${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${data.toString("hex")}`;
  }

  async function decrypt(payload) {
    if (!payload) return "";
    const [version, ivHex, tagHex, dataHex] = String(payload).split(":");
    if (version !== "v1" || !ivHex || !tagHex || !dataHex) {
      throw new Error("Unrecognized stored secret format");
    }
    const decipher = crypto.createDecipheriv("aes-256-gcm", await key(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
  }

  return { encrypt, decrypt };
}

module.exports = { createSecrets };
