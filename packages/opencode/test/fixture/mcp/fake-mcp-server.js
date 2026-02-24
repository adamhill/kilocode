// Minimal JSON-RPC 2.0 MCP server over stdio for testing
// Implements initialize, tools/list, tools/call
// Exits on stdin close, SIGTERM, or SIGINT

let readBuffer = ""

process.stdin.setEncoding("utf8")
process.stdin.on("data", (chunk) => {
  readBuffer += chunk
  processBuffer()
})

process.stdin.on("end", () => {
  process.exit(0)
})

process.on("SIGTERM", () => process.exit(0))
process.on("SIGINT", () => process.exit(0))

function processBuffer() {
  while (true) {
    const headerEnd = readBuffer.indexOf("\r\n\r\n")
    if (headerEnd === -1) break
    const header = readBuffer.slice(0, headerEnd)
    const match = /Content-Length:\s*(\d+)/i.exec(header)
    if (!match) break
    const len = parseInt(match[1], 10)
    const bodyStart = headerEnd + 4
    if (readBuffer.length < bodyStart + len) break
    const body = readBuffer.slice(bodyStart, bodyStart + len)
    readBuffer = readBuffer.slice(bodyStart + len)
    handle(body)
  }
}

function send(msg) {
  const json = JSON.stringify(msg)
  const header = `Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n`
  process.stdout.write(header + json)
}

function handle(raw) {
  let data
  try {
    data = JSON.parse(raw)
  } catch {
    return
  }

  if (data.method === "initialize") {
    send({
      jsonrpc: "2.0",
      id: data.id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "fake-mcp-server", version: "1.0.0" },
      },
    })
    return
  }

  if (data.method === "notifications/initialized") {
    return
  }

  if (data.method === "tools/list") {
    send({
      jsonrpc: "2.0",
      id: data.id,
      result: {
        tools: [
          {
            name: "fake_tool",
            description: "A fake tool for testing",
            inputSchema: { type: "object", properties: {}, additionalProperties: false },
          },
        ],
      },
    })
    return
  }

  if (data.method === "tools/call") {
    send({
      jsonrpc: "2.0",
      id: data.id,
      result: { content: [{ type: "text", text: "ok" }] },
    })
    return
  }

  // Respond to any other request to keep transport flowing
  if (typeof data.id !== "undefined") {
    send({ jsonrpc: "2.0", id: data.id, result: null })
    return
  }
}
