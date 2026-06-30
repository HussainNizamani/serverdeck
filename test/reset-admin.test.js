const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createStore } = require("../src/store");
const { verifyPassword } = require("../src/auth");
const { resetPassword } = require("../scripts/reset-admin");

test("resetPassword sets a new password, clears 2FA/sessions, keeps servers", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "serverdeck-reset-"));
  const store = createStore(path.join(dir, "state.json"));
  await store.load();
  store.setSetting("auth", {
    user: { email: "old@b.co", passwordHash: "scrypt:x:y", totpEnabled: true, totpSecret: "SEKRET", createdAt: "2020-01-01" },
    sessions: [{ id: "s" }]
  });
  store.createServer({ name: "keep-me", host: "10.0.0.1", user: "root" });

  const result = await resetPassword(store, " NEW@Example.com ", "hunter2!");
  assert.equal(result.email, "new@example.com");           // normalized
  assert.equal(result.generated, false);

  const auth = store.getSetting("auth");
  assert.equal(auth.user.email, "new@example.com");
  assert.ok(verifyPassword("hunter2!", auth.user.passwordHash)); // new password works
  assert.equal(auth.user.totpEnabled, false);              // 2FA cleared
  assert.equal(auth.user.totpSecret, null);
  assert.equal(auth.sessions.length, 0);                   // logged out everywhere
  assert.equal(auth.user.createdAt, "2020-01-01");         // original creation kept
  assert.equal(store.listServers().length, 1);             // servers untouched
});

test("resetPassword generates a usable temporary password when none is given", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "serverdeck-reset-"));
  const store = createStore(path.join(dir, "state.json"));
  await store.load();

  const result = await resetPassword(store, "a@b.co");
  assert.equal(result.generated, true);
  assert.ok(result.password.length >= 8);
  assert.ok(verifyPassword(result.password, store.getSetting("auth").user.passwordHash));
});

test("resetPassword rejects an invalid email", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "serverdeck-reset-"));
  const store = createStore(path.join(dir, "state.json"));
  await store.load();
  await assert.rejects(() => resetPassword(store, "not-an-email", "hunter2!"), /valid email/);
});
