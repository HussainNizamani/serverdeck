const crypto = require("node:crypto");

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function acceptKey(key) {
  return crypto.createHash("sha1").update(`${key}${WS_GUID}`).digest("base64");
}

function encodeFrame(data) {
  const payload = Buffer.from(data);
  const length = payload.length;
  let header;

  if (length < 126) {
    header = Buffer.from([0x81, length]);
  } else if (length <= 0xffff) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  return Buffer.concat([header, payload]);
}

function decodeFrames(buffer) {
  const frames = [];
  let offset = 0;

  while (buffer.length - offset >= 2) {
    const first = buffer[offset];
    const second = buffer[offset + 1];
    const opcode = first & 0x0f;
    const masked = Boolean(second & 0x80);
    let length = second & 0x7f;
    let headerLength = 2;

    if (length === 126) {
      if (buffer.length - offset < 4) break;
      length = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (length === 127) {
      if (buffer.length - offset < 10) break;
      length = Number(buffer.readBigUInt64BE(offset + 2));
      headerLength = 10;
    }

    const maskLength = masked ? 4 : 0;
    const frameLength = headerLength + maskLength + length;
    if (buffer.length - offset < frameLength) break;

    let payload = buffer.subarray(offset + headerLength + maskLength, offset + frameLength);
    if (masked) {
      const mask = buffer.subarray(offset + headerLength, offset + headerLength + 4);
      payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
    }

    frames.push({ opcode, payload });
    offset += frameLength;
  }

  return { frames, remaining: buffer.subarray(offset) };
}

function acceptWebSocket(req, socket) {
  const key = req.headers["sec-websocket-key"];
  if (!key) {
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
    socket.destroy();
    return null;
  }

  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${acceptKey(key)}`,
    "\r\n"
  ].join("\r\n"));

  let buffer = Buffer.alloc(0);
  const messageHandlers = new Set();
  const closeHandlers = new Set();
  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    try {
      socket.end(Buffer.from([0x88, 0x00]));
    } catch {
      socket.destroy();
    }
    closeHandlers.forEach(handler => handler());
  }

  function send(data) {
    if (!closed && socket.writable) {
      socket.write(encodeFrame(data));
    }
  }

  socket.on("data", chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    const decoded = decodeFrames(buffer);
    buffer = decoded.remaining;

    for (const frame of decoded.frames) {
      if (frame.opcode === 0x8) {
        close();
        return;
      }
      if (frame.opcode === 0x9) {
        socket.write(Buffer.concat([Buffer.from([0x8a, frame.payload.length]), frame.payload]));
        continue;
      }
      if (frame.opcode === 0x1 || frame.opcode === 0x2) {
        const message = frame.payload.toString("utf8");
        messageHandlers.forEach(handler => handler(message));
      }
    }
  });

  socket.on("close", () => {
    if (closed) return;
    closed = true;
    closeHandlers.forEach(handler => handler());
  });

  socket.on("error", () => close());

  return {
    send,
    sendJson(value) {
      send(JSON.stringify(value));
    },
    onMessage(handler) {
      messageHandlers.add(handler);
    },
    onClose(handler) {
      closeHandlers.add(handler);
    },
    close
  };
}

module.exports = {
  acceptKey,
  encodeFrame,
  decodeFrames,
  acceptWebSocket
};
