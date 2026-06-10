const crypto = require("node:crypto");

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const MAX_SESSIONS = 20;
const LOGIN_WINDOW_MS = 1000 * 60 * 5;
const LOGIN_MAX_ATTEMPTS = 8;

function nowIso() {
  return new Date().toISOString();
}

/* ---------- password hashing (scrypt) ---------- */

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const parts = String(stored || "").split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hash] = parts;
  const candidate = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

/* ---------- TOTP (RFC 6238, compatible with Google Authenticator) ---------- */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(text) {
  const clean = String(text || "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of clean) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function totpCode(secretBase32, timeStep) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(timeStep));
  const digest = crypto.createHmac("sha1", base32Decode(secretBase32)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code = (
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3]
  ) % 1000000;
  return String(code).padStart(6, "0");
}

function verifyTotp(secretBase32, code, windowSteps = 1) {
  const normalized = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized) || !secretBase32) return false;
  const step = Math.floor(Date.now() / 30000);
  for (let offset = -windowSteps; offset <= windowSteps; offset += 1) {
    if (totpCode(secretBase32, step + offset) === normalized) return true;
  }
  return false;
}

function generateTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}

function otpauthUrl(email, secret) {
  const label = encodeURIComponent(`Server Deck:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent("Server Deck")}&algorithm=SHA1&digits=6&period=30`;
}

/* ---------- network allowlist (Tailscale-only access) ---------- */

const DEFAULT_ALLOW_NETWORKS = "127.0.0.0/8,100.64.0.0/10,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16";

function ipv4ToInt(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function parseAllowedNetworks(spec) {
  return String(spec || DEFAULT_ALLOW_NETWORKS)
    .split(",")
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => {
      const [base, prefixRaw] = entry.split("/");
      const baseInt = ipv4ToInt(base);
      if (baseInt === null) return null;
      const prefix = prefixRaw === undefined ? 32 : Number(prefixRaw);
      if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
      const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
      return { base: (baseInt & mask) >>> 0, mask };
    })
    .filter(Boolean);
}

function normalizeRemoteIp(remoteAddress) {
  const raw = String(remoteAddress || "");
  if (raw.startsWith("::ffff:")) return raw.slice(7);
  return raw;
}

function isIpAllowed(remoteAddress, networks) {
  const ip = normalizeRemoteIp(remoteAddress);
  if (ip === "::1") return true;
  const ipInt = ipv4ToInt(ip);
  if (ipInt === null) return false;
  return networks.some(network => ((ipInt & network.mask) >>> 0) === network.base);
}

/* ---------- session + account management ---------- */

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function parseCookies(req) {
  const header = String(req.headers.cookie || "");
  const cookies = {};
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    cookies[part.slice(0, separator).trim()] = decodeURIComponent(part.slice(separator + 1).trim());
  }
  return cookies;
}

function httpError(message, statusCode, extra = {}) {
  return Object.assign(new Error(message), { statusCode, ...extra });
}

function createAuth(store) {
  const loginAttempts = new Map();

  async function readAuth() {
    const data = await store.getSetting("auth");
    return data && typeof data === "object" ? data : { user: null, sessions: [], pendingTotpSecret: null };
  }

  async function writeAuth(data) {
    await store.setSetting("auth", data);
  }

  function pruneSessions(sessions) {
    const cutoff = Date.now() - SESSION_TTL_MS;
    return (sessions || [])
      .filter(session => new Date(session.lastSeenAt || session.createdAt).getTime() > cutoff)
      .slice(0, MAX_SESSIONS);
  }

  function checkRateLimit(ip) {
    const key = normalizeRemoteIp(ip) || "unknown";
    const entry = loginAttempts.get(key);
    if (entry && entry.resetAt > Date.now() && entry.count >= LOGIN_MAX_ATTEMPTS) {
      throw httpError("Too many login attempts. Try again in a few minutes.", 429);
    }
  }

  function recordFailedLogin(ip) {
    const key = normalizeRemoteIp(ip) || "unknown";
    const entry = loginAttempts.get(key);
    if (!entry || entry.resetAt <= Date.now()) {
      loginAttempts.set(key, { count: 1, resetAt: Date.now() + LOGIN_WINDOW_MS });
    } else {
      entry.count += 1;
    }
  }

  async function status(req) {
    const auth = await readAuth();
    const session = await sessionFromRequest(req);
    return {
      setupRequired: !auth.user,
      authenticated: Boolean(session),
      email: session ? auth.user?.email || "" : "",
      totpEnabled: session ? Boolean(auth.user?.totpEnabled) : undefined
    };
  }

  async function setup({ email, password }) {
    const auth = await readAuth();
    if (auth.user) throw httpError("An account already exists.", 409);
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw httpError("A valid email is required.", 400);
    if (String(password || "").length < 8) throw httpError("Password must be at least 8 characters.", 400);
    auth.user = {
      email: cleanEmail,
      passwordHash: hashPassword(password),
      totpSecret: null,
      totpEnabled: false,
      createdAt: nowIso()
    };
    auth.sessions = [];
    await writeAuth(auth);
    return { ok: true };
  }

  async function login({ email, password, totp, ip, userAgent }) {
    checkRateLimit(ip);
    const auth = await readAuth();
    if (!auth.user) throw httpError("No account exists yet. Complete setup first.", 400);

    const cleanEmail = String(email || "").trim().toLowerCase();
    const passwordOk = cleanEmail === auth.user.email && verifyPassword(password, auth.user.passwordHash);
    if (!passwordOk) {
      recordFailedLogin(ip);
      throw httpError("Invalid email or password.", 401);
    }

    if (auth.user.totpEnabled) {
      if (!totp) throw httpError("Authenticator code required.", 401, { totpRequired: true });
      if (!verifyTotp(auth.user.totpSecret, totp)) {
        recordFailedLogin(ip);
        throw httpError("Invalid authenticator code.", 401, { totpRequired: true });
      }
    }

    const token = crypto.randomBytes(32).toString("hex");
    const createdAt = nowIso();
    const session = {
      id: crypto.randomUUID(),
      tokenHash: hashToken(token),
      createdAt,
      lastSeenAt: createdAt,
      ip: normalizeRemoteIp(ip),
      userAgent: String(userAgent || "").slice(0, 160)
    };
    auth.sessions = pruneSessions([session, ...(auth.sessions || [])]);
    await writeAuth(auth);
    return { token, session };
  }

  async function sessionFromRequest(req) {
    const token = parseCookies(req).serverdeck_session;
    if (!token) return null;
    const auth = await readAuth();
    const tokenHash = hashToken(token);
    const session = (auth.sessions || []).find(item => item.tokenHash === tokenHash);
    if (!session) return null;
    if (new Date(session.lastSeenAt || session.createdAt).getTime() < Date.now() - SESSION_TTL_MS) return null;
    // Refresh lastSeenAt at most once per minute to limit store writes.
    if (Date.now() - new Date(session.lastSeenAt).getTime() > 60000) {
      session.lastSeenAt = nowIso();
      await writeAuth(auth);
    }
    return session;
  }

  async function logout(req) {
    const token = parseCookies(req).serverdeck_session;
    if (!token) return;
    const auth = await readAuth();
    const tokenHash = hashToken(token);
    auth.sessions = (auth.sessions || []).filter(session => session.tokenHash !== tokenHash);
    await writeAuth(auth);
  }

  async function listSessions(req) {
    const auth = await readAuth();
    const token = parseCookies(req).serverdeck_session;
    const currentHash = token ? hashToken(token) : "";
    return pruneSessions(auth.sessions).map(session => ({
      id: session.id,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      ip: session.ip,
      userAgent: session.userAgent,
      current: session.tokenHash === currentHash
    }));
  }

  async function revokeSession(sessionId) {
    const auth = await readAuth();
    const before = (auth.sessions || []).length;
    auth.sessions = (auth.sessions || []).filter(session => session.id !== sessionId);
    await writeAuth(auth);
    return auth.sessions.length < before;
  }

  async function changePassword({ currentPassword, newPassword }) {
    const auth = await readAuth();
    if (!auth.user) throw httpError("No account exists.", 400);
    if (!verifyPassword(currentPassword, auth.user.passwordHash)) throw httpError("Current password is incorrect.", 401);
    if (String(newPassword || "").length < 8) throw httpError("New password must be at least 8 characters.", 400);
    auth.user.passwordHash = hashPassword(newPassword);
    await writeAuth(auth);
    return { ok: true };
  }

  async function totpInit() {
    const auth = await readAuth();
    if (!auth.user) throw httpError("No account exists.", 400);
    const secret = generateTotpSecret();
    auth.pendingTotpSecret = secret;
    await writeAuth(auth);
    return { secret, otpauth: otpauthUrl(auth.user.email, secret) };
  }

  async function totpEnable({ code }) {
    const auth = await readAuth();
    if (!auth.user) throw httpError("No account exists.", 400);
    if (!auth.pendingTotpSecret) throw httpError("Start two-factor setup first.", 400);
    if (!verifyTotp(auth.pendingTotpSecret, code)) throw httpError("Code did not match. Check your authenticator app and try again.", 400);
    auth.user.totpSecret = auth.pendingTotpSecret;
    auth.user.totpEnabled = true;
    auth.pendingTotpSecret = null;
    await writeAuth(auth);
    return { ok: true };
  }

  async function totpDisable({ password }) {
    const auth = await readAuth();
    if (!auth.user) throw httpError("No account exists.", 400);
    if (!verifyPassword(password, auth.user.passwordHash)) throw httpError("Password is incorrect.", 401);
    auth.user.totpSecret = null;
    auth.user.totpEnabled = false;
    auth.pendingTotpSecret = null;
    await writeAuth(auth);
    return { ok: true };
  }

  return {
    status,
    setup,
    login,
    logout,
    sessionFromRequest,
    listSessions,
    revokeSession,
    changePassword,
    totpInit,
    totpEnable,
    totpDisable
  };
}

module.exports = {
  createAuth,
  parseAllowedNetworks,
  isIpAllowed,
  normalizeRemoteIp,
  DEFAULT_ALLOW_NETWORKS,
  // Exported for tests.
  hashPassword,
  verifyPassword,
  base32Encode,
  base32Decode,
  totpCode,
  verifyTotp
};
