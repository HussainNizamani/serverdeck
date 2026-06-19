const assert = require("node:assert/strict");
const test = require("node:test");
const { commandForTask, shQuote, parseMetrics } = require("../src/tasks");

test("quotes shell arguments safely", () => {
  assert.equal(shQuote("alpha'beta"), "'alpha'\\''beta'");
});

test("builds services command", () => {
  assert.match(commandForTask({ task: "services" }), /systemctl list-units/);
});

test("rejects unsupported service actions", () => {
  assert.throws(() => commandForTask({
    task: "serviceAction",
    service: "nginx.service",
    action: "remove"
  }), /Unsupported service action/);
});

test("overview command emits a parseable metrics block", () => {
  const command = commandForTask({ task: "overview" });
  assert.match(command, /== Metrics ==/);
  assert.match(command, /mem_used_percent=/);
  assert.match(command, /disk_used_percent=/);
  assert.match(command, /failed_services=/);
});

test("rejects unknown tasks", () => {
  assert.throws(() => commandForTask({ task: "files" }), /Unknown server task/);
  assert.throws(() => commandForTask({ task: "nope" }), /Unknown server task/);
});

test("command task requires a command", () => {
  assert.throws(() => commandForTask({ task: "command", command: "  " }), /Command is required/);
  assert.match(commandForTask({ task: "command", command: "uptime" }), /uptime/);
});

test("parseMetrics reads the raw metrics block", () => {
  const m = parseMetrics("cpu 123456 78901\nmem 41.2\ndisk 63\nnet 12345678 9012345\n");
  assert.deepEqual(m.cpu, { total: 123456, idle: 78901 });
  assert.equal(m.memPercent, 41.2);
  assert.equal(m.diskPercent, 63);
  assert.deepEqual(m.net, { rx: 12345678, tx: 9012345 });
});

test("parseMetrics tolerates missing lines", () => {
  const m = parseMetrics("mem 50\n");
  assert.equal(m.memPercent, 50);
  assert.equal(m.cpu, null);
  assert.equal(m.net, null);
});
