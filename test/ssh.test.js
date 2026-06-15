const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { buildSshArgs, expandHome, listSshKeys, remapKeyPath, resolveIdentity, splitKeyPaths } = require("../src/ssh");

test("expands home-relative key paths", () => {
  assert.equal(expandHome("~/id_rsa"), path.join(os.homedir(), "id_rsa"));
  assert.equal(expandHome('"~/id_rsa"'), path.join(os.homedir(), "id_rsa"));
});

test("adds OpenSSH identity files to ssh args", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "serverdeck-key-"));
  const keyPath = path.join(dir, "id_rsa");
  fs.writeFileSync(keyPath, "not-a-real-key");
  const built = buildSshArgs({
    host: "example.com",
    user: "root",
    port: 2222,
    keyPath
  }, { command: "uptime" });

  assert.equal(built.error, undefined);
  assert.ok(built.args.includes("-i"));
  assert.ok(built.args.includes(keyPath));
  assert.ok(built.args.includes("root@example.com"));
  assert.ok(built.args.includes("uptime"));
});

test("adds quoted OpenSSH identity files to ssh args", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "serverdeck-key-"));
  const keyPath = path.join(dir, "id_rsa");
  fs.writeFileSync(keyPath, "not-a-real-key");
  const built = buildSshArgs({
    host: "example.com",
    user: "root",
    port: 2222,
    keyPath: `"${keyPath}"`
  }, { command: "uptime" });

  assert.equal(built.error, undefined);
  assert.ok(built.args.includes("-i"));
  assert.ok(built.args.includes(keyPath));
});

test("splitKeyPaths parses newline-separated key paths", () => {
  assert.deepEqual(splitKeyPaths("/keys/a\n/keys/b"), ["/keys/a", "/keys/b"]);
  assert.deepEqual(splitKeyPaths(""), []);
  assert.deepEqual(splitKeyPaths("  /keys/a  \n\n /keys/b "), ["/keys/a", "/keys/b"]);
});

test("adds multiple identity files when several keys are selected", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "serverdeck-key-"));
  const k1 = path.join(dir, "id_ed25519");
  const k2 = path.join(dir, "deploy.key");
  fs.writeFileSync(k1, "key-1");
  fs.writeFileSync(k2, "key-2");
  const built = buildSshArgs(
    { host: "example.com", user: "root", port: 22, keyPath: `${k1}\n${k2}` },
    { command: "uptime" }
  );

  assert.equal(built.error, undefined);
  assert.equal(built.args.filter(arg => arg === "-i").length, 2);
  assert.ok(built.args.includes(k1));
  assert.ok(built.args.includes(k2));
});

test("remaps host key paths to container key paths", () => {
  const previous = process.env.SERVERDECK_KEY_PATH_REMAPS;
  process.env.SERVERDECK_KEY_PATH_REMAPS = "/home/exampleuser/keys=/keys";
  assert.equal(
    remapKeyPath("/home/exampleuser/keys/server-key.key"),
    "/keys/server-key.key"
  );
  if (previous === undefined) delete process.env.SERVERDECK_KEY_PATH_REMAPS;
  else process.env.SERVERDECK_KEY_PATH_REMAPS = previous;
});

test("lists private keys from the single shared key directory only", () => {
  const previous = process.env.SERVERDECK_KEY_UPLOAD_DIR;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "serverdeck-keys-"));
  fs.writeFileSync(path.join(dir, "main-key.key"), "not-a-real-key");
  fs.writeFileSync(path.join(dir, "main-key.key.pub"), "public-key");
  fs.writeFileSync(path.join(dir, "config"), "Host *");
  process.env.SERVERDECK_KEY_UPLOAD_DIR = dir;

  const keys = listSshKeys();
  assert.ok(keys.some(key => key.path === path.join(dir, "main-key.key")));
  assert.ok(!keys.some(key => key.path.endsWith(".pub")));
  assert.ok(!keys.some(key => key.path.endsWith("/config")));
  // Strictly one directory: nothing outside `dir` is ever returned.
  assert.ok(keys.every(key => key.path.startsWith(dir)));

  if (previous === undefined) delete process.env.SERVERDECK_KEY_UPLOAD_DIR;
  else process.env.SERVERDECK_KEY_UPLOAD_DIR = previous;
});

test("reports missing PPK converter for ppk keys when puttygen is absent", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "serverdeck-ppk-"));
  const keyPath = path.join(dir, "server.ppk");
  fs.writeFileSync(keyPath, "PuTTY-User-Key-File-3: ssh-rsa\n");
  const identity = resolveIdentity({ keyPath });

  if (identity.error) {
    assert.match(identity.error, /PPK keys require puttygen|PPK conversion failed/);
  } else {
    assert.ok(identity.args.includes("-i"));
    identity.cleanup();
  }
});
