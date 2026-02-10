# MCP (Model Context Protocol) + MCP Hub

- **What it is**: A protocol for connecting external tool/resource servers, plus a hub that manages MCP connections.

## Capabilities

- Multiple transports (local stdio, remote HTTP/SSE).
- OAuth support for remote servers.
- Allowlisting/disablement of tools.
- Auto-reconnect and error history.

## Docs references

- [`apps/kilocode-docs/pages/automate/mcp/overview.md`](../../apps/kilocode-docs/pages/automate/mcp/overview.md)

## Suggested migration

- **Kilo CLI availability**: Already.
- **Migration recommendation**:
    - Prefer Kilo CLI server MCP endpoints for MCP lifecycle, tool routing, and execution.
    - Keep VS Code UI and approval/consent surfaces in the extension host.
- **Reimplementation required?**: No.

## Primary implementation anchors

- [`src/services/mcp/`](../../src/services/mcp/)
- [`src/services/mcp/oauth/`](../../src/services/mcp/oauth/)
