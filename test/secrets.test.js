const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSecrets } = require("../src/secrets");
const { createStore, normalizeServerInput } = require("../src/store");

function tempStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "serverdeck-secrets-"));
  const store = createStore(path.join(dir, "state.json"));
  store.load();
  return store;
}

test("encrypts and decrypts round-trip", async () => {
  const secrets = createSecrets(tempStore());
  const blob = await secrets.encrypt("hunter2-extra-secret");
  assert.match(blob, /^v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
  assert.equal(await secrets.decrypt(blob), "hunter2-extra-secret");
});

test("empty values pass through", async () => {
  const secrets = createSecrets(tempStore());
  assert.equal(await secrets.encrypt(""), "");
  assert.equal(await secrets.decrypt(""), "");
});

test("tampered ciphertext is rejected", async () => {
  const secrets = createSecrets(tempStore());
  const blob = await secrets.encrypt("password");
  const parts = blob.split(":");
  parts[3] = parts[3].replace(/^./, parts[3][0] === "0" ? "1" : "0");
  await assert.rejects(() => secrets.decrypt(parts.join(":")));
});

test("persisted key decrypts across instances of the same store", async () => {
  const store = tempStore();
  const first = createSecrets(store);
  const blob = await first.encrypt("stable");
  const second = createSecrets(store);
  assert.equal(await second.decrypt(blob), "stable");
});

test("normalizeServerInput keeps, replaces, and clears passwordEnc", () => {
  const created = normalizeServerInput({ host: "h", passwordEnc: "v1:aa:bb:cc" });
  assert.equal(created.passwordEnc, "v1:aa:bb:cc");

  const kept = normalizeServerInput({ host: "h" }, created);
  assert.equal(kept.passwordEnc, "v1:aa:bb:cc");

  const replaced = normalizeServerInput({ host: "h", passwordEnc: "v1:dd:ee:ff" }, created);
  assert.equal(replaced.passwordEnc, "v1:dd:ee:ff");

  const cleared = normalizeServerInput({ host: "h", passwordEnc: "" }, created);
  assert.equal(cleared.passwordEnc, "");
});
