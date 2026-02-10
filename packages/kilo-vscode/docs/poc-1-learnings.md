# PoC #1 learnings (OpenCode backend)

PoC #1 implemented an OpenCode-backed execution path end-to-end: server lifecycle (Phase 1), SSE streaming (Phase 2), and a thin chat bridge that drives the existing Kilo chat UI.

Implementation anchors:

- [`OpenCodeServerManager`](src/services/opencode/OpenCodeServerManager.ts:1)
- [`OpenCodeClient`](src/services/opencode/OpenCodeClient.ts:1)
- [`SseParser`](src/services/opencode/sse/SseParser.ts:1)
- [`OpenCodeBackedChat`](src/services/opencode/OpenCodeBackedChat.ts:1)
- routing in [`Task.startTask()`](src/core/task/Task.ts:2045) and default flag in [`Task.isOpenCodeBackendEnabled()`](src/core/task/Task.ts:2102)

## 1) What PoC #1 actually proved

PoC #1 proved we can:

1. Spawn and supervise an OpenCode server process from the extension, discover an ephemeral local port, and wait until the server is healthy via `/config` polling (see [`OpenCodeServerManager.ensureStarted()`](src/services/opencode/OpenCodeServerManager.ts:47) and [`OpenCodeServerManager.waitForHealthy()`](src/services/opencode/OpenCodeServerManager.ts:125)).
2. Authenticate calls to OpenCode using HTTP basic auth from the extension HTTP client (see [`OpenCodeClient`](src/services/opencode/OpenCodeClient.ts:1)).
3. Consume OpenCode’s long-lived SSE endpoint and parse messages robustly across chunk boundaries (see [`OpenCodeClient.openEventStream()`](src/services/opencode/OpenCodeClient.ts:76), [`streamSseMessages()`](src/services/opencode/sse/streamSse.ts:1), and [`SseParser.push()`](src/services/opencode/sse/SseParser.ts:40)).
4. Map OpenCode “message delta” events into Kilo’s existing “partial message” UI update model, including reconnect on SSE disconnects and abort support (see [`OpenCodeBackedChat.startEventLoop()`](src/services/opencode/OpenCodeBackedChat.ts:103) and [`OpenCodeBackedChat.abort()`](src/services/opencode/OpenCodeBackedChat.ts:79)).
5. Route new tasks through this OpenCode path (instead of the normal API handler) and make the backend default-enabled with an explicit opt-out (see [`Task.startTask()`](src/core/task/Task.ts:2045) and [`Task.isOpenCodeBackendEnabled()`](src/core/task/Task.ts:2102)).

Non-goals / intentionally out of scope for PoC #1:

- Tool execution, permission gating, and safety boundaries (we did not wire OpenCode tool events into Kilo tools).
- Persisted “source of truth” mapping between Kilo task history and OpenCode session history.

## 2) New learnings (what wasn’t explicit in the plan)

This section captures concrete, implemented details and the “surprises” that fell out of doing the work.

### 2.1 Running OpenCode from the extension: “execute a package bin” vs bundling

- We spawn an OpenCode CLI binary from within the extension environment rather than bundling a server executable.
    - Resolution logic is non-trivial: first try the extension’s `node_modules/.bin/kilo`, and fall back to resolving `@kilocode/cli/package.json` and then `bin/kilo` (see [`OpenCodeServerManager.resolveOpenCodeBinPath()`](src/services/opencode/OpenCodeServerManager.ts:145)).
    - Practical implication: packaging and dependency layout (pnpm, bundlers) directly affect runtime behavior, so “bin discovery” is part of the runtime contract.

### 2.2 Authentication mechanics for SSE and API calls

- The server uses a password provided via `OPENCODE_SERVER_PASSWORD` (see [`OpenCodeServerManager.startProcess()`](src/services/opencode/OpenCodeServerManager.ts:69)).
- The client uses HTTP basic auth (`axios` `auth` config) for both normal requests and the SSE stream (see [`OpenCodeClient`](src/services/opencode/OpenCodeClient.ts:1)).
- Credentials are generated at runtime:
    - username is hard-coded to `opencode` (see [`OpenCodeServerManager`](src/services/opencode/OpenCodeServerManager.ts:21))
    - password is random per extension-host process (see [`OpenCodeServerManager`](src/services/opencode/OpenCodeServerManager.ts:21))
- Consequence: credentials and sessions are inherently ephemeral; any server restart or extension reload must be treated as a new authentication boundary.

### 2.3 Ephemeral port discovery had to be explicit

- Instead of relying on OpenCode to pick and print a port, PoC #1 allocates a free local port itself using a temporary `net` server bound to port `0`, then starts OpenCode with `--port <selected>` (see [`OpenCodeServerManager.findFreePort()`](src/services/opencode/OpenCodeServerManager.ts:164) and [`OpenCodeServerManager.startProcess()`](src/services/opencode/OpenCodeServerManager.ts:69)).
- Consequence: the extension is responsible for “port selection correctness” and must handle port-binding edge cases (rare, but real in parallel processes).

### 2.4 “Server started” is not equivalent to “server ready”

- PoC #1 added an explicit health gate: poll `/config` until it responds successfully, with a hard timeout (see [`OpenCodeServerManager.waitForHealthy()`](src/services/opencode/OpenCodeServerManager.ts:125) and [`OpenCodeClient.getConfig()`](src/services/opencode/OpenCodeClient.ts:43)).
- Consequence: task start-up includes an unavoidable readiness wait; the UX and logging should assume the first few requests may fail transiently.

### 2.5 Process lifecycle edge cases required restart/backoff behavior

- The OpenCode server process can exit unexpectedly; PoC #1 implements a bounded restart loop with exponential backoff (see [`OpenCodeServerManager.restartWithBackoff()`](src/services/opencode/OpenCodeServerManager.ts:102)).
- Shutdown behavior is “best effort” (`proc.kill()` inside try/catch) and must tolerate already-dead processes (see [`OpenCodeServerManager.stop()`](src/services/opencode/OpenCodeServerManager.ts:56)).
- Consequence: we now have _two_ reliability loops:
    - process restart loop (server manager)
    - SSE reconnect loop (chat bridge)
      These need to be made compatible before PoC #2 (e.g., when server restarts imply session invalidation).

### 2.6 SSE parsing realities

- We implemented our own minimal SSE parser rather than relying on a library (see [`SseParser`](src/services/opencode/sse/SseParser.ts:1)).
- Key compatibility behaviors that turned out to matter:
    - chunk boundaries can split lines; parsing must buffer (see [`SseParser.push()`](src/services/opencode/sse/SseParser.ts:40))
    - OpenCode emits JSON payloads in `data:` and may omit `event:` (see [`SseMessage.event`](src/services/opencode/sse/SseParser.ts:3))
    - multi-line `data:` is valid and must be joined with `\n` (see [`SseMessage.data`](src/services/opencode/sse/SseParser.ts:3))

### 2.7 Reconnect semantics were implemented (but are intentionally simplistic)

- The SSE loop treats any stream end as an error and reconnects with exponential backoff (see [`OpenCodeBackedChat.startEventLoop()`](src/services/opencode/OpenCodeBackedChat.ts:103)).
- We do **not** use SSE `id:` / Last-Event-ID for replay or de-duplication (see [`SseMessage.id`](src/services/opencode/sse/SseParser.ts:3)).
    - Consequence: during transient disconnects, we may miss events (at-most-once) or, depending on server behavior, potentially see duplicates.

### 2.8 Session-to-task mapping decisions (and their consequences)

- A single OpenCode session is created lazily per Kilo task instance (see [`OpenCodeBackedChat.ensureSession()`](src/services/opencode/OpenCodeBackedChat.ts:50)).
- Session scope is “directory-scoped” and we consistently pass `directory: this.cwd` (see [`Task.startOpenCodeChat()`](src/core/task/Task.ts:2114) and [`OpenCodeClient.createSession()`](src/services/opencode/OpenCodeClient.ts:53)).
- The backend is routed at task start time; if enabled, we bypass the normal API request loop entirely (see [`Task.startTask()`](src/core/task/Task.ts:2045)).

### 2.9 Partial streaming mapping caveats

- Kilo’s UI updates were achieved by accumulating a full assistant text string and sending partial updates as deltas arrive (see [`Task.startOpenCodeChat()`](src/core/task/Task.ts:2114)).
- On the OpenCode side, we filter SSE events to stream only assistant text parts:
    - track assistant message IDs when `message.updated` arrives
    - stream `message.part.updated` only if the part belongs to the tracked assistant message and is text
      (see [`OpenCodeBackedChat.handleEvent()`](src/services/opencode/OpenCodeBackedChat.ts:140)).
- Consequences / caveats:
    - This relies on receiving `message.updated` before associated `message.part.updated` for a message; out-of-order delivery would cause dropped deltas.
    - Only `text` parts are handled; other part types are ignored.

### 2.10 Abort behavior needs to consider both HTTP and SSE layers

- Abort is implemented as:
    - `POST /session/:id/abort` (best effort)
    - destroy the SSE stream locally
      (see [`OpenCodeClient.abortSession()`](src/services/opencode/OpenCodeClient.ts:65) and [`OpenCodeBackedChat.abort()`](src/services/opencode/OpenCodeBackedChat.ts:79)).
- `Task.cancelCurrentRequest()` also aborts OpenCode if the task is in OpenCode mode (see [`Task.cancelCurrentRequest()`](src/core/task/Task.ts:2454)).
- Consequence: abort semantics are currently “UI-first” (stop streaming now), with server abort attempted but not guaranteed.

### 2.11 Default-enabled backend has testing and rollout implications

- The OpenCode backend is default-enabled unless a user explicitly sets `opencodeBackend.enabled = false` (see [`Task.isOpenCodeBackendEnabled()`](src/core/task/Task.ts:2102)).
- If configuration access fails (common in some test harnesses), we still default to enabled.
- Consequence: PoC #2 needs explicit strategy for:
    - tests that expect the legacy path
    - feature gating and safe rollback

### 2.12 Logging is present but unstructured

- Server stdout/stderr are piped into the extension logs (see [`OpenCodeServerManager.startProcess()`](src/services/opencode/OpenCodeServerManager.ts:69)).
- OpenCode bridge logs parse failures and reconnect attempts (see [`OpenCodeBackedChat.startEventLoop()`](src/services/opencode/OpenCodeBackedChat.ts:103)).
- Consequence: PoC #2 will need tighter log hygiene (avoid secrets) and better correlation fields (task ID, session ID, directory).

## 3) Risks/unknowns still blocking PoC #2

These are items that must be verified or tightened before adding tool/permission support (PoC #2). Items are grounded in current PoC #1 behavior; any hypotheses are explicitly labeled.

### 3.1 Permission / tool event shape and scoping

- PoC #1 only handles a small set of event types (see [`OpenCodeBackedChat.handleEvent()`](src/services/opencode/OpenCodeBackedChat.ts:140)).
- Unknown: what events represent “permission required”, “tool requested”, and “tool result accepted” in OpenCode.
- Unknown: whether events are scoped purely by `directory` or if additional scoping is required to avoid cross-session contamination.

### 3.2 Tool safety boundaries and approval integration

- PoC #1 does not bridge OpenCode tool requests into Kilo’s tool system.
- Risk: without a strict mapping layer, OpenCode could request actions that bypass Kilo’s existing safety model (mode restrictions, allowlists, user approvals).

### 3.3 Multi-root workspace handling

- Current behavior uses `directory: this.cwd` (single path) for both session creation and event subscription (see [`Task.startOpenCodeChat()`](src/core/task/Task.ts:2114)).
- Unknown: how OpenCode should behave when the VS Code workspace has multiple roots.
    - Hypothesis: we’ll need deterministic selection (active folder, task folder, or user-configured root) and per-root sessions.

### 3.4 History and “source of truth”

- Kilo persists chat/task history independently of OpenCode session state.
- Risk: if OpenCode becomes the execution backend, we must define:
    - what is canonical (Kilo history vs OpenCode session)
    - how to recover on restart (both extension restart and server restart)
    - how to replay context when recreating sessions

### 3.5 Server restart recovery and session continuity

- The server manager can restart the process (see [`OpenCodeServerManager.restartWithBackoff()`](src/services/opencode/OpenCodeServerManager.ts:102)).
- The chat bridge can reconnect the SSE stream (see [`OpenCodeBackedChat.startEventLoop()`](src/services/opencode/OpenCodeBackedChat.ts:103)).
- Risk: a server restart likely invalidates existing sessions and/or event streams; PoC #1 does not recreate sessions or rehydrate state.

### 3.6 Reconnect correctness and event loss/duplication

- We currently ignore SSE `id` and do not pass Last-Event-ID on reconnect (see [`SseMessage.id`](src/services/opencode/sse/SseParser.ts:3)).
- Risk: tooling/permission flows may require stronger guarantees than “best effort streaming”, otherwise approvals and tool execution can desync.

## 4) Concrete recommendations before PoC #2 (prioritized checklist)

### P0 — Must do before implementing tools/permissions

- [ ] Define and codify an explicit OpenCode event contract (type guards / schema validation) for the events PoC #2 will rely on, and add “unknown event” logging with payload redaction (entry point: [`OpenCodeBackedChat.handleEvent()`](src/services/opencode/OpenCodeBackedChat.ts:140)).
- [ ] Make session lifecycle resilient to restarts:
    - [ ] detect server restarts (health check change, auth failures, or SSE end)
    - [ ] recreate OpenCode session as needed
    - [ ] decide how to replay or summarize task context when recreating
          (session creation entry point: [`OpenCodeBackedChat.ensureSession()`](src/services/opencode/OpenCodeBackedChat.ts:50)).
- [ ] Establish an approval and tool-safety boundary layer so OpenCode cannot trigger Kilo tools without going through existing restrictions and user consent (routing entry point: [`Task.startTask()`](src/core/task/Task.ts:2045)).

### P1 — Hardening and operational readiness

- [ ] Add correlation-friendly logging (task ID, session ID, directory) and ensure no credentials leak into logs (server logs are currently piped verbatim; see [`OpenCodeServerManager.startProcess()`](src/services/opencode/OpenCodeServerManager.ts:69)).
- [ ] Decide and implement multi-root behavior for `directory` scoping (currently uses `this.cwd`; see [`Task.startOpenCodeChat()`](src/core/task/Task.ts:2114)).
- [ ] Clarify abort semantics across layers:
    - [ ] confirm what OpenCode guarantees after `abort`
    - [ ] ensure SSE reconnect does not revive an aborted message
          (current abort flow: [`OpenCodeBackedChat.abort()`](src/services/opencode/OpenCodeBackedChat.ts:79)).

### P2 — Packaging/compatibility polish

- [ ] Validate OpenCode binary resolution in packaged extension builds (pnpm and bundled layouts), and across platforms (resolution logic: [`OpenCodeServerManager.resolveOpenCodeBinPath()`](src/services/opencode/OpenCodeServerManager.ts:145)).
- [ ] Decide whether to incorporate SSE `id` / Last-Event-ID for stronger reconnect guarantees (parser already captures `id`; see [`SseMessage.id`](src/services/opencode/sse/SseParser.ts:3)).
