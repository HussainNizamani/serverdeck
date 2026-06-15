const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  enforceKeyPerms,
  looksLikeKeyFilename,
  sanitizeKeyName,
  validatePrivateKey
} = require("../src/ssh");

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "serverdeck-keys-"));
}

test("validatePrivateKey accepts an unencrypted PEM key", () => {
  const { privateKey } = crypto.generateKeyPairSync("ed25519", {
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" }
  });
  assert.equal(validatePrivateKey(privateKey).ok, true);
});

test("validatePrivateKey accepts a passphrase-protected key", () => {
  const { privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem", cipher: "aes-256-cbc", passphrase: "secret" },
    publicKeyEncoding: { type: "spki", format: "pem" }
  });
  assert.equal(validatePrivateKey(privateKey).ok, true);
});

test("validatePrivateKey accepts a PPK key by structure", () => {
  const result = validatePrivateKey("PuTTY-User-Key-File-3: ssh-ed25519\nEncryption: none\n");
  assert.equal(result.ok, true);
  assert.equal(result.type, "ppk");
});

test("validatePrivateKey rejects arbitrary text and empty input", () => {
  assert.equal(validatePrivateKey("just some notes\nnot a key").ok, false);
  assert.equal(validatePrivateKey("").ok, false);
});

test("validatePrivateKey rejects a corrupt PEM envelope", () => {
  const junk = "-----BEGIN PRIVATE KEY-----\nnot-base64-key-data\n-----END PRIVATE KEY-----\n";
  assert.equal(validatePrivateKey(junk).ok, false);
});

test("sanitizeKeyName neutralizes path traversal to a bare basename", () => {
  assert.equal(sanitizeKeyName("../../etc/shadow"), "shadow");
  assert.equal(sanitizeKeyName("/keys/id_ed25519"), "id_ed25519");
  assert.equal(sanitizeKeyName("my-server.key"), "my-server.key");
});

test("sanitizeKeyName rejects unsafe or non-private-key names", () => {
  assert.throws(() => sanitizeKeyName("bad name.key"));   // whitespace
  assert.throws(() => sanitizeKeyName("id_rsa.pub"));      // public key
  assert.throws(() => sanitizeKeyName("authorized_keys")); // reserved
  assert.throws(() => sanitizeKeyName("config"));          // reserved
  assert.throws(() => sanitizeKeyName(".."));
  assert.throws(() => sanitizeKeyName(""));
});

test("looksLikeKeyFilename matches what the discovery scan surfaces", () => {
  assert.equal(looksLikeKeyFilename("id_ed25519"), true);
  assert.equal(looksLikeKeyFilename("server.key"), true);
  assert.equal(looksLikeKeyFilename("server.pem"), true);
  assert.equal(looksLikeKeyFilename("server.ppk"), true);
  // Extensionless uploads aren't discoverable, so the handler appends .key.
  assert.equal(looksLikeKeyFilename("deploy_key"), false);
  assert.equal(looksLikeKeyFilename("deploy_key.key"), true);
  assert.equal(looksLikeKeyFilename("id_ed25519.pub"), false);
  assert.equal(looksLikeKeyFilename("config"), false);
});

test("enforceKeyPerms sets 0700 on the dir and 0600 on keys, leaving .pub readable", () => {
  const dir = tempDir();
  const keyPath = path.join(dir, "id_ed25519");
  const pubPath = path.join(dir, "id_ed25519.pub");
  fs.writeFileSync(keyPath, "key");
  fs.writeFileSync(pubPath, "pub");
  fs.chmodSync(dir, 0o755);
  fs.chmodSync(keyPath, 0o644);
  fs.chmodSync(pubPath, 0o644);

  enforceKeyPerms(dir);

  assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
  assert.equal(fs.statSync(keyPath).mode & 0o777, 0o600);
  assert.equal(fs.statSync(pubPath).mode & 0o777, 0o644);
});
