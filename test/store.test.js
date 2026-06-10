const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createStore, normalizeBubbleLabel, normalizeFilePath, normalizeTags } = require("../src/store");

test("normalizes comma separated tags", () => {
  assert.deepEqual(normalizeTags("prod, db, , client-a"), ["prod", "db", "client-a"]);
});

test("normalizes bubble labels to three uppercase characters", () => {
  assert.equal(normalizeBubbleLabel(" db1 "), "DB1");
  assert.equal(normalizeBubbleLabel("web-prod"), "WEB");
  assert.equal(normalizeBubbleLabel("a b"), "AB");
});

test("normalizes quoted file paths", () => {
  assert.equal(normalizeFilePath('"/home/exampleuser/keys/server-key.key"'), "/home/exampleuser/keys/server-key.key");
  assert.equal(normalizeFilePath(" '/tmp/key.pem' "), "/tmp/key.pem");
});

test("creates groups and assigns servers to them", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "serverdeck-groups-"));
  const store = createStore(path.join(dir, "state.json"));
  store.load();

  const group = store.createGroup({ name: " Dubai " });
  assert.equal(group.name, "Dubai");
  assert.equal(store.listGroups().length, 1);

  const server = store.createServer({
    name: "Dubai General 1",
    host: "192.0.2.20",
    groupId: group.id
  });
  assert.equal(server.groupId, group.id);

  const renamed = store.updateGroup(group.id, { name: "Dubai VPS" });
  assert.equal(renamed.name, "Dubai VPS");

  assert.equal(store.deleteGroup(group.id), true);
  assert.equal(store.getServer(server.id).groupId, "");
});

test("creates, updates, and stores server reports", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "serverdeck-store-"));
  const store = createStore(path.join(dir, "state.json"));
  store.load();

  const server = store.createServer({
    name: "Primary",
    host: "192.0.2.10",
    user: "deploy",
    port: 2222,
    bubbleLabel: "db1",
    keyPath: '"~/.ssh/server.ppk"',
    tags: "prod,web",
    notes: "Runs the app"
  });

  assert.equal(server.name, "Primary");
  assert.equal(server.host, "192.0.2.10");
  assert.equal(server.port, 2222);
  assert.equal(server.bubbleLabel, "DB1");
  assert.equal(server.keyPath, "~/.ssh/server.ppk");
  assert.equal(server.agentToken.length, 48);

  const updated = store.updateServer(server.id, { host: "192.0.2.11", tags: ["prod"] });
  assert.equal(updated.host, "192.0.2.11");
  assert.deepEqual(updated.tags, ["prod"]);

  const report = store.recordReport(server.id, {
    hostname: "primary",
    memory: { used_percent: 22.5 }
  });
  assert.ok(report.id);

  const taskRun = store.recordTaskRun(server.id, {
    task: "services",
    actionTask: "services",
    input: { task: "services" },
    status: "ok",
    exitCode: 0,
    durationMs: 123,
    stdout: "nginx.service loaded",
    stderr: ""
  });
  assert.ok(taskRun.id);
  assert.equal(taskRun.task, "services");
  assert.match(taskRun.refreshedAt, /T/);

  const loaded = store.getServer(server.id);
  assert.equal(loaded.lastReport.payload.hostname, "primary");
  assert.equal(loaded.reportHistory.length, 1);
  assert.equal(loaded.taskHistory.length, 1);
  assert.equal(store.listTaskHistory(server.id, "services").length, 1);
});
