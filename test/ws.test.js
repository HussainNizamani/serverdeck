const assert = require("node:assert/strict");
const test = require("node:test");
const { acceptKey, decodeFrames, encodeFrame } = require("../src/ws");

test("creates websocket accept key", () => {
  assert.equal(
    acceptKey("dGhlIHNhbXBsZSBub25jZQ=="),
    "s3pPLMBiTxaQ9kYGzzhZRbK+xOo="
  );
});

test("encodes and decodes short text frames", () => {
  const encoded = encodeFrame("hello");
  const decoded = decodeFrames(encoded);
  assert.equal(decoded.frames.length, 1);
  assert.equal(decoded.frames[0].opcode, 1);
  assert.equal(decoded.frames[0].payload.toString("utf8"), "hello");
  assert.equal(decoded.remaining.length, 0);
});
