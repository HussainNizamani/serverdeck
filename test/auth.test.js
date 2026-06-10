const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  createAuth,
  parseAllowedNetworks,
  isIpAllowed,
  DEFAULT_ALLOW_NETWORKS,
  hashPassword,
  verifyPassword,
  base32Encode,
  base32Decode,
  totpCode,
  verifyTotp
} = require("../src/auth");
const { createStore } = require("../src/store");

function tempStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "serverdeck-auth-"));
  const store = createStore(path.join(dir, "state.json"));
  store.load();
  return store;
}

function requestWithCookie(token) {
  return { headers: { cookie: token ? `serverdeck_session=${token}` : "" } };
}

test("hashes and verifies passwords", () => {
  const stored = hashPassword("correct horse battery");
  assert.ok(verifyPassword("correct horse battery", stored));
  assert.ok(!verifyPassword("wrong password", stored));
  assert.ok(!verifyPassword("anything", "garbage"));
});

test("base32 round-trips", () => {
  const buf = Buffer.from("hello totp secret!");
  assert.deepEqual(base32Decode(base32Encode(buf)), buf);
});

test("verifies current TOTP codes and rejects bad ones", () => {
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  const step = Math.floor(Date.now() / 30000);
  assert.ok(verifyTotp(secret, totpCode(secret, step)));
  assert.ok(verifyTotp(secret, totpCode(secret, step - 1)), "previous window accepted");
  assert.ok(!verifyTotp(secret, "000000") || totpCode(secret, step) === "000000");
  assert.ok(!verifyTotp(secret, "12345"));
});

test("allows tailscale and loopback, blocks public IPs", () => {
  const networks = parseAllowedNetworks(DEFAULT_ALLOW_NETWORKS);
  assert.ok(isIpAllowed("127.0.0.1", networks));
  assert.ok(isIpAllowed("::ffff:127.0.0.1", networks));
  assert.ok(isIpAllowed("100.101.102.103", networks), "tailscale CGNAT range");
  assert.ok(isIpAllowed("172.18.0.1", networks), "docker bridge");
  assert.ok(isIpAllowed("::1", networks));
  assert.ok(!isIpAllowed("8.8.8.8", networks));
  assert.ok(!isIpAllowed("203.0.113.7", networks));
});

test("setup, login, session, and logout flow", async () => {
  const auth = createAuth(tempStore());

  let status = await auth.status(requestWithCookie(""));
  assert.equal(status.setupRequired, true);

  await auth.setup({ email: "owner@example.com", password: "supersecret1" });
  await assert.rejects(() => auth.setup({ email: "x@y.dev", password: "password123" }), /already exists/);

  await assert.rejects(
    () => auth.login({ email: "owner@example.com", password: "wrong", ip: "127.0.0.1" }),
    /Invalid email or password/
  );

  const login = await auth.login({ email: "owner@example.com", password: "supersecret1", ip: "127.0.0.1", userAgent: "test" });
  assert.ok(login.token);

  const session = await auth.sessionFromRequest(requestWithCookie(login.token));
  assert.ok(session);

  status = await auth.status(requestWithCookie(login.token));
  assert.equal(status.authenticated, true);
  assert.equal(status.email, "owner@example.com");

  await auth.logout(requestWithCookie(login.token));
  assert.equal(await auth.sessionFromRequest(requestWithCookie(login.token)), null);
});

test("totp enable requires valid code and gates login", async () => {
  const auth = createAuth(tempStore());
  await auth.setup({ email: "owner@example.com", password: "supersecret1" });

  const init = await auth.totpInit();
  assert.ok(init.secret.length >= 16);
  assert.ok(init.otpauth.startsWith("otpauth://totp/"));

  await assert.rejects(() => auth.totpEnable({ code: "000001" }), /did not match/);
  const step = Math.floor(Date.now() / 30000);
  await auth.totpEnable({ code: totpCode(init.secret, step) });

  await assert.rejects(
    () => auth.login({ email: "owner@example.com", password: "supersecret1", ip: "127.0.0.1" }),
    err => err.totpRequired === true
  );

  const login = await auth.login({
    email: "owner@example.com",
    password: "supersecret1",
    totp: totpCode(init.secret, Math.floor(Date.now() / 30000)),
    ip: "127.0.0.1"
  });
  assert.ok(login.token);
});

test("password change rejects wrong current password", async () => {
  const auth = createAuth(tempStore());
  await auth.setup({ email: "owner@example.com", password: "supersecret1" });
  await assert.rejects(() => auth.changePassword({ currentPassword: "nope", newPassword: "newpassword1" }), /incorrect/);
  await auth.changePassword({ currentPassword: "supersecret1", newPassword: "newpassword1" });
  const login = await auth.login({ email: "owner@example.com", password: "newpassword1", ip: "127.0.0.1" });
  assert.ok(login.token);
});
