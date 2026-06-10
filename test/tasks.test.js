const assert = require("node:assert/strict");
const test = require("node:test");
const { commandForTask, shQuote } = require("../src/tasks");

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
