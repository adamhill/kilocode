# Memory Leak & Orphan Process Detection Tests

## Overview

8 test files and 1 fixture file in `packages/opencode/test/` to detect memory leaks and orphan processes in Kilo CLI. These tests target the specific leak sources identified in upstream [opencode#3013](https://github.com/anomalyco/opencode/issues/3013).

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `test/fixture/mcp/fake-mcp-server.js` | ~90 | Minimal JSON-RPC 2.0 MCP server over stdio |
| `test/memory/helper.ts` | ~130 | Shared utilities for all memory/process tests |
| `test/memory/orphan-process.test.ts` | ~175 | Orphan process detection after MCP/LSP lifecycle |
| `test/memory/heap-growth.test.ts` | ~125 | Unbounded heap growth across subsystems |
| `test/memory/disposal.test.ts` | ~145 | Disposal chain correctness verification |
| `test/memory/mcp-lifecycle.test.ts` | ~130 | MCP-specific leak scenarios |
| `test/memory/lsp-lifecycle.test.ts` | ~130 | LSP server process lifecycle |
| `test/memory/state-leak.test.ts` | ~175 | State/Bus/GlobalBus/subscription leaks |
| `test/memory/session-heap-growth.test.ts` | ~145 | Full session DB + event lifecycle |

## Test Results: 28 tests total

### 23 PASS — no leaks detected in these areas

| Suite | Tests | Key Findings |
|-------|-------|-------------|
| `disposal.test.ts` | 5/5 | Disposal chain works: `Instance.dispose` -> `State.dispose`, idempotent `disposeAll`, slow disposal completes |
| `state-leak.test.ts` | 5/5 | `recordsByKey` cleared on dispose, Instance cache cleared on `disposeAll`, GlobalBus listeners bounded, Bus subscriptions per-instance and cleared |
| `lsp-lifecycle.test.ts` | 3/3 | `LSPClient.shutdown()` correctly kills server process, no orphans after 5 cycles, 0.22 MB growth over 10 cycles |
| `heap-growth.test.ts` | 4/4 | Instance provide/dispose: 0.57 MB/20 cycles. Bus subscriptions: 0.50 MB/100 cycles. State entries: -0.40 MB/100 cycles. MCP add/disconnect heap: 0.00 MB/3 cycles |
| `session-heap-growth.test.ts` | 3/3 | Session create/remove: 0.32 MB/10 cycles. Message CRUD: 0.15 MB/50 ops. Full lifecycle with events: 0.27 MB/25 sessions |
| `orphan-process.test.ts` | 1/4 | LSP shutdown: no orphans |
| `mcp-lifecycle.test.ts` | 1/3 | `MCP.tools()` 50x: 0.05 MB growth |

### 5 FAIL — correctly detecting real MCP orphan process bugs

| Test | Error |
|------|-------|
| MCP: no orphans after dispose | `Found 1 orphan process: bun fake-mcp-server.js` |
| MCP: no orphans after disconnect | `Found 1 orphan process: bun fake-mcp-server.js` |
| disposeAll cleans up all instances | `Found 1 orphan process: bun fake-mcp-server.js` |
| MCP.add closes existing before overwriting | `Found 1 orphan process: bun fake-mcp-server.js` |
| MCP.connect closes existing before reconnecting | `Found 1 orphan process: bun fake-mcp-server.js` |

## Root Cause Confirmed

Every MCP test that spawns a server and then calls `client.close()` (via `StdioClientTransport`) leaves the child process alive. The MCP SDK's `StdioClientTransport.close()` closes the transport pipes but does **not** kill the spawned child process. This is the exact orphan process bug described in upstream #3013.

In contrast, `LSPClient.shutdown()` explicitly calls `process.kill()` on the server process, which is why all LSP tests pass cleanly.

## Architecture Decisions

- **Real processes, mocked nothing for process tests**: MCP/LSP servers are real `child_process.spawn` instances running `fake-mcp-server.js` / `fake-lsp-server.js`. This ensures process lifecycle is tested authentically.
- **`pgrep -P` for process tree snapshots**: Works on macOS and Linux CI. Each test takes a before/after snapshot and asserts no new orphan descendants.
- **`afterEach` safety net**: Force-kills any orphans to prevent cascading test failures.
- **Empty config for MCP tests**: The MCP `state()` init connects to ALL configured servers on first access. Putting servers in config doubles connections and causes timeouts. Tests use `MCP.add()` directly.
- **Session tests use real DB, no LLM mock**: Instead of mocking `streamText`'s complex async iterable, session tests exercise `Session.create/updateMessage/updatePart/remove` with Bus subscriptions — covering the real Database + Bus + State code paths.
- **Generous thresholds**: `< 10 MB` for most growth tests, `< 5 MB` for targeted ones. Multiple GC passes (`Bun.gc(true)` x 3) with 50ms sleeps for stable measurement.

## Running the Tests

```bash
cd packages/opencode

# All memory tests (non-MCP-process tests complete in ~150s)
bun test test/memory/disposal.test.ts test/memory/state-leak.test.ts test/memory/lsp-lifecycle.test.ts test/memory/heap-growth.test.ts test/memory/session-heap-growth.test.ts

# MCP process tests (detect real orphan bugs, ~300s)
bun test test/memory/orphan-process.test.ts test/memory/mcp-lifecycle.test.ts

# Individual suites
bun test test/memory/disposal.test.ts
bun test test/memory/session-heap-growth.test.ts
```

## What Happens When The Bug Is Fixed

Once `StdioClientTransport.close()` is patched to kill the child process (or a wrapper is added in `src/mcp/index.ts`), all 5 currently-failing orphan tests will pass — providing regression protection.
