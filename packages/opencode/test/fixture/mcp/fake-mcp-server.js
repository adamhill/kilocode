// Minimal JSON-RPC 2.0 MCP server over stdio for testing
// Uses newline-delimited JSON (NDJSON) format matching the MCP SDK
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
    const index = readBuffer.indexOf("\n")
    if (index === -1) break
    const line = readBuffer.slice(0, index).replace(/\r$/, "")
    readBuffer = readBuffer.slice(index + 1)
    if (line.length === 0) continue
    handle(line)
  }
}

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n")
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
