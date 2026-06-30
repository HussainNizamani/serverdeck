#!/usr/bin/env node
// Break-glass password reset for the admin account, run from the panel host.
// There is deliberately no email/self-service reset: the panel has no mail
// server and is reachable only over localhost/Tailscale, where a network
// reset would let anyone on the tailnet seize the account. Host access already
// means ownership (you control the DB, keys, and .env), so this just sets the
// account to the given email + a new password. Servers, groups, and SSH keys
// are untouched; 2FA and existing sessions are cleared (re-enable 2FA in
// Settings, and you're logged out everywhere).
//
//   docker compose exec app node scripts/reset-admin.js you@example.com [new-password]
//   node scripts/reset-admin.js you@example.com [new-password]   # bare-metal
//
// Omit the password to have a strong temporary one generated and printed.
const crypto = require("node:crypto");
const path = require("node:path");
const { createStore } = require("../src/store");
const { createPostgresStore } = require("../src/postgres-store");
const { hashPassword } = require("../src/auth");

async function resetPassword(store, email, newPassword) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error("A valid email is required.");
  const generated = !newPassword;
  const password = newPassword || crypto.randomBytes(9).toString("base64url"); // ~12 chars
  if (String(password).length < 8) throw new Error("Password must be at least 8 characters.");

  await store.load();
  const auth = (await store.getSetting("auth")) || {};
  await store.setSetting("auth", {
    user: {
      email: cleanEmail,
      passwordHash: hashPassword(password),
      totpSecret: null,
      totpEnabled: false,
      createdAt: auth.user?.createdAt || new Date().toISOString()
    },
    sessions: [],
    pendingTotpSecret: null
  });
  return { email: cleanEmail, password, generated };
}

if (require.main === module) {
  const [email, newPassword] = process.argv.slice(2);
  if (!email) {
    console.error("Usage: node scripts/reset-admin.js <email> [new-password]");
    process.exit(1);
  }
  const ROOT = path.join(__dirname, "..");
  const DATA_DIR = process.env.SERVERDECK_DATA_DIR || path.join(ROOT, "data");
  const DATABASE_URL = process.env.DATABASE_URL || process.env.SERVERDECK_DATABASE_URL || "";
  const store = DATABASE_URL
    ? createPostgresStore({ connectionString: DATABASE_URL })
    : createStore(path.join(DATA_DIR, "state.json"));

  resetPassword(store, email, newPassword)
    .then(result => {
      console.log(`Password reset for ${result.email}.`);
      if (result.generated) console.log(`Temporary password: ${result.password}\nLog in and change it from Settings.`);
      console.log("Two-factor was cleared — re-enable it in Settings if you use it.");
      process.exit(0);
    })
    .catch(err => {
      console.error(err.message || err);
      process.exit(1);
    });
}

module.exports = { resetPassword };
