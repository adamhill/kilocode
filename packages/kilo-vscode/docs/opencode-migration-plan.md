# Plan: Replace Kilo Code core agent/chat with a Kilo CLI server backend

## Scope

Replace the _agent runtime + orchestration loop_ currently centered in [`src/core/task/Task.ts`](../src/core/task/Task.ts:181) with the Kilo CLI server (started and managed by the extension). Preserve the existing webview UI entrypoint [`src/core/webview/webviewMessageHandler.ts`](../src/core/webview/webviewMessageHandler.ts:111) and overall UX.

## Parity guardrails (must not regress)

This plan intentionally stays **backend-focused** (swapping Kilo’s orchestration loop for an Kilo CLI server). To prevent “successful backend swap, broken product” outcomes, treat the documents below as **canonical parity requirements** and gate each migration phase against them.

### Chat UI interactive parity

Interactive chat UX must remain functionally equivalent, including all existing click/keyboard actions, state transitions, and extension ↔ webview message flows.

Treat the pages under [`docs/opencode-core/chat-ui-features/`](chat-ui-features:1) as the canonical parity requirements:

- [`docs/opencode-core/chat-ui-features/auto-approval-controls.md`](chat-ui-features/auto-approval-controls.md:1)
- [`docs/opencode-core/chat-ui-features/browser-session-controls.md`](chat-ui-features/browser-session-controls.md:1)
- [`docs/opencode-core/chat-ui-features/checkpoint-task-management.md`](chat-ui-features/checkpoint-task-management.md:1)
- [`docs/opencode-core/chat-ui-features/code-block-interactions.md`](chat-ui-features/code-block-interactions.md:1)
- [`docs/opencode-core/chat-ui-features/command-execution.md`](chat-ui-features/command-execution.md:1)
- [`docs/opencode-core/chat-ui-features/context-menus-tooltips.md`](chat-ui-features/context-menus-tooltips.md:1)
- [`docs/opencode-core/chat-ui-features/diff-viewing-file-operations.md`](chat-ui-features/diff-viewing-file-operations.md:1)
- [`docs/opencode-core/chat-ui-features/file-permission-dialogs.md`](chat-ui-features/file-permission-dialogs.md:1)
- [`docs/opencode-core/chat-ui-features/follow-up-questions.md`](chat-ui-features/follow-up-questions.md:1)
- [`docs/opencode-core/chat-ui-features/image-handling.md`](chat-ui-features/image-handling.md:1)
- [`docs/opencode-core/chat-ui-features/inline-actions-on-tool-messages.md`](chat-ui-features/inline-actions-on-tool-messages.md:1)
- [`docs/opencode-core/chat-ui-features/mermaid-diagram-features.md`](chat-ui-features/mermaid-diagram-features.md:1)
- [`docs/opencode-core/chat-ui-features/message-editing-management.md`](chat-ui-features/message-editing-management.md:1)
- [`docs/opencode-core/chat-ui-features/special-content-types.md`](chat-ui-features/special-content-types.md:1)
- [`docs/opencode-core/chat-ui-features/todo-list-management.md`](chat-ui-features/todo-list-management.md:1)

Practical implication for this migration plan: any Kilo CLI event mapping / session model decisions must preserve the ability to implement the above UI interactions without protocol hacks or UI regressions.

### Non-agent parity (must not regress)

This migration replaces the agent/chat loop, but Kilo Code is also a platform with critical non-agent subsystems that must continue to work unchanged (or be explicitly re-homed/rewired during the migration).

Treat the pages under [`docs/opencode-core/non-agent-features/`](non-agent-features:1) as the canonical parity requirements:

- [`docs/opencode-core/non-agent-features/agent-manager.md`](non-agent-features/agent-manager.md:1)
- [`docs/opencode-core/non-agent-features/authentication-organization-enterprise-enforcement.md`](non-agent-features/authentication-organization-enterprise-enforcement.md:1)
- [`docs/opencode-core/non-agent-features/auto-purge.md`](non-agent-features/auto-purge.md:1)
- [`docs/opencode-core/non-agent-features/autocomplete-ghost.md`](non-agent-features/autocomplete-ghost.md:1)
- [`docs/opencode-core/non-agent-features/browser-automation-url-ingestion.md`](non-agent-features/browser-automation-url-ingestion.md:1)
- [`docs/opencode-core/non-agent-features/checkpoints.md`](non-agent-features/checkpoints.md:1)
- [`docs/opencode-core/non-agent-features/code-actions.md`](non-agent-features/code-actions.md:1)
- [`docs/opencode-core/non-agent-features/code-reviews.md`](non-agent-features/code-reviews.md:1)
- [`docs/opencode-core/non-agent-features/codebase-indexing-semantic-search.md`](non-agent-features/codebase-indexing-semantic-search.md:1)
- [`docs/opencode-core/non-agent-features/contribution-tracking.md`](non-agent-features/contribution-tracking.md:1)
- [`docs/opencode-core/non-agent-features/custom-command-system.md`](non-agent-features/custom-command-system.md:1)
- [`docs/opencode-core/non-agent-features/deploy-and-secure-surfaces.md`](non-agent-features/deploy-and-secure-surfaces.md:1)
- [`docs/opencode-core/non-agent-features/fast-edits.md`](non-agent-features/fast-edits.md:1)
- [`docs/opencode-core/non-agent-features/git-commit-message-generation.md`](non-agent-features/git-commit-message-generation.md:1)
- [`docs/opencode-core/non-agent-features/integrations.md`](non-agent-features/integrations.md:1)
- [`docs/opencode-core/non-agent-features/marketplace.md`](non-agent-features/marketplace.md:1)
- [`docs/opencode-core/non-agent-features/mcp-and-mcp-hub.md`](non-agent-features/mcp-and-mcp-hub.md:1)
- [`docs/opencode-core/non-agent-features/memory-bank.md`](non-agent-features/memory-bank.md:1)
- [`docs/opencode-core/non-agent-features/search-and-repo-scanning-infrastructure.md`](non-agent-features/search-and-repo-scanning-infrastructure.md:1)
- [`docs/opencode-core/non-agent-features/settings-sync-integration.md`](non-agent-features/settings-sync-integration.md:1)
- [`docs/opencode-core/non-agent-features/skills-system.md`](non-agent-features/skills-system.md:1)
- [`docs/opencode-core/non-agent-features/speech-to-text.md`](non-agent-features/speech-to-text.md:1)
- [`docs/opencode-core/non-agent-features/terminal-shell-integration.md`](non-agent-features/terminal-shell-integration.md:1)

Additional parity guardrail (cross-cutting):

- [`docs/opencode-core/non-agent-features/localization-and-locale-alignment.md`](non-agent-features/localization-and-locale-alignment.md:1)

Practical implication for this migration plan: treat these as “must-continue-to-function” constraints when changing lifecycle, storage, permissions, MCP wiring, or any extension-host services.

---

## Parity scope by phase (MVP parity vs full parity)

This plan uses “parity docs are canonical” as a guardrail, but some parity pages explicitly call certain features _non-blocking_ for early phases. To remove ambiguity, define parity scope per migration phase:

- **Phase 2 MVP parity**: The chat surface is coherent and safe for users, but certain _non-core_ or _capability-dependent_ features may degrade if Kilo CLI does not support them yet.
- **Full parity (target by Phase 4)**: All canonical parity requirements are met or explicitly re-homed with equivalent UX.

### Phase 2 MVP parity matrix (initial scope)

Notes:

- “Degradation allowed” is documented as _principles_ (see the next section), not final product behavior.
- Ownership fields that are disputed or unresolved are explicitly deferred.

| Feature area (canonical doc)                                                                                                                           | Phase 2 MVP required? | Degradation allowed in Phase 2? (principles only)             | Ownership after migration                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| Core send/stream/stop + state transitions (driven via [`src/core/webview/webviewMessageHandler.ts`](../src/core/webview/webviewMessageHandler.ts:111)) | Yes                   | No (must remain coherent)                                     | Extension host + webview                                 |
| [`docs/opencode-core/chat-ui-features/code-block-interactions.md`](chat-ui-features/code-block-interactions.md:1)                                      | Yes                   | Minimal (styling-only differences acceptable)                 | Webview-only (UI)                                        |
| [`docs/opencode-core/chat-ui-features/context-menus-tooltips.md`](chat-ui-features/context-menus-tooltips.md:1)                                        | Yes                   | Minimal (styling-only differences acceptable)                 | Webview-only (UI)                                        |
| [`docs/opencode-core/chat-ui-features/image-handling.md`](chat-ui-features/image-handling.md:1)                                                        | Yes                   | Minimal (no loss of basic view/open)                          | Webview-only (UI)                                        |
| [`docs/opencode-core/chat-ui-features/diff-viewing-file-operations.md`](chat-ui-features/diff-viewing-file-operations.md:1)                            | No                    | Yes (hide/disable diff UI when backend can’t produce diffs)   | Decision required later (Kilo CLI vs extension host)     |
| [`docs/opencode-core/chat-ui-features/file-permission-dialogs.md`](chat-ui-features/file-permission-dialogs.md:1)                                      | No                    | Yes (no permission UI shown if tools are off)                 | Decision required later                                  |
| [`docs/opencode-core/chat-ui-features/command-execution.md`](chat-ui-features/command-execution.md:1)                                                  | No                    | Yes (command UI must not imply capabilities)                  | Decision required later                                  |
| [`docs/opencode-core/chat-ui-features/auto-approval-controls.md`](chat-ui-features/auto-approval-controls.md:1)                                        | No                    | Yes (hide/disable when Kilo CLI permissions are not bridged)  | Decision required later                                  |
| [`docs/opencode-core/chat-ui-features/inline-actions-on-tool-messages.md`](chat-ui-features/inline-actions-on-tool-messages.md:1)                      | No                    | Yes (hide actions if tool rows aren’t present)                | Decision required later                                  |
| [`docs/opencode-core/chat-ui-features/message-editing-management.md`](chat-ui-features/message-editing-management.md:1)                                | No                    | Yes (read-only history in MVP)                                | Decision required later (state model dependent)          |
| [`docs/opencode-core/chat-ui-features/checkpoint-task-management.md`](chat-ui-features/checkpoint-task-management.md:1)                                | No                    | Yes (defer restore/edit flows to later phases)                | Decision required later (state model dependent)          |
| [`docs/opencode-core/chat-ui-features/special-content-types.md`](chat-ui-features/special-content-types.md:1)                                          | Partial               | Yes (render safe fallbacks for unknown rows)                  | Decision required later (MCP + tool ownership dependent) |
| [`docs/opencode-core/chat-ui-features/follow-up-questions.md`](chat-ui-features/follow-up-questions.md:1)                                              | No                    | Yes (omit suggestions UI if not supported)                    | Decision required later                                  |
| [`docs/opencode-core/chat-ui-features/todo-list-management.md`](chat-ui-features/todo-list-management.md:1)                                            | No                    | Yes (omit todo UI if not supported)                           | Decision required later                                  |
| [`docs/opencode-core/chat-ui-features/browser-session-controls.md`](chat-ui-features/browser-session-controls.md:1)                                    | No (out of scope)     | N/A (intentionally disabled; UI hidden for Kilo CLI sessions) | Decision 5: use Kilo CLI web fetch; no browser sessions  |
| [`docs/opencode-core/chat-ui-features/mermaid-diagram-features.md`](chat-ui-features/mermaid-diagram-features.md:1)                                    | No                    | Yes (render as plain markdown/image fallback)                 | Decision required later                                  |

### Full parity (target by Phase 4)

By Phase 4, the goal is that _all_ canonical parity docs are either:

- implemented end-to-end with Kilo CLI as the backend, or
- explicitly re-homed (extension-host/webview-only) with equivalent UX, or
- intentionally removed as a product decision (**Decision required later**).

---

## Degradation principles (missing metadata & capability gaps)

When moving to Kilo CLI-backed tooling, some metadata may be unavailable (e.g., PID for command execution), or some capabilities may not exist initially. This section documents **principles** that constrain implementation without making product-level choices.

Principles:

1. **Never present false affordances**: if a feature cannot work, the UI must not look “enabled” or imply it will act.
2. **Prefer “hide” over “broken”**: if a capability is absent, hide the control/row entirely unless discoverability is essential (**Decision required later**).
3. **If shown, label uncertainty explicitly**: use neutral labels like “Not available” / “Unknown” rather than empty or misleading fields.
4. **Scope actions safely**: when identifiers like PID aren’t available, actions (e.g., abort) must clearly communicate what they affect (current task/session vs process) and must be routed through the authoritative backend.
5. **Keep accessibility intact**: hidden/disabled states must remain keyboard navigable and screen-reader coherent (no focus traps on removed controls).

---

## NFR budget (measurable non-functional targets)

Swapping the orchestration engine changes reliability/performance characteristics. These targets are designed to be measurable and to drive rollback decisions.

### Targets

| Category                          | Budget / target                                                                                                                                                                                                                                                                 | Notes                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Performance (TTFT)                | P95 time-to-first-token ≤ 2.0s (stable network, typical model)                                                                                                                                                                                                                  | Measured from “user send” → first assistant delta rendered                |
| Performance (UI update cadence)   | UI update publish rate capped at 20–60 updates/sec per active task                                                                                                                                                                                                              | Prevent render thrash on `message.part.updated` deltas                    |
| Reliability (SSE health)          | Sustained SSE connection uptime ≥ 99.5% during an active task session                                                                                                                                                                                                           | Reconnect allowed; must not wedge UI                                      |
| Reliability (reconnect semantics) | **Decision 7 (Policy C — Refresh-on-reconnect):** on any SSE reconnect, the client **discards partial UI state** and **rehydrates** the full UI timeline from Kilo CLI session/message endpoints; if full rehydration is not possible → **hard error** with a **Retry** action. | Avoids client-side de-duplication/ordering assumptions across reconnects. |
| Security / privacy                | No credentials written to logs/telemetry; provider credentials stored via Kilo CLI plaintext JSON store with best-effort permissions (Decision 3)                                                                                                                               | Windows: acknowledge reduced at-rest protection vs keychain               |
| Compatibility                     | Workspace/path safety baseline: **lexical containment only** (no lexically out-of-root reads/writes). **Not symlink-safe**; Windows drive semantics caveats are documented.                                                                                                     | Hardening + regression suite are follow-on deliverables                   |

### How we measure it

| Signal                                              | Definition                                                                        | Source / collection point                                        | Used as                            |
| --------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------- |
| `kilo.cli.chat.ttft_ms`                             | ms from webview send intent → first rendered assistant delta                      | Extension host (message handler + adapter)                       | Phase gates + regression alerts    |
| `kilo.cli.sse.reconnect_count`                      | reconnect attempts per session/hour                                               | Extension host SSE client                                        | Rollback trigger if spiking        |
| `kilo.cli.sse.auth_failures`                        | 401/403 failures on SSE connect                                                   | Extension host SSE client                                        | Configuration diagnostics          |
| `kilo.cli.session.rehydrate_fail_count`             | count of reconnects where the client cannot fully rehydrate session/message state | Extension host Kilo CLI client + adapter                         | Reliability regression alerts      |
| `kilo.cli.adapter.unknown_event_type`               | count of unhandled Kilo CLI event `type` values                                   | Adapter normalization layer                                      | Mapping correctness + alerting     |
| `kilo.cli.server.crash_count`                       | server exits/crashes per day                                                      | Server lifecycle manager                                         | Rollback trigger                   |
| `kilo.cli.permissions.prompt_count`                 | permission prompts shown per task                                                 | Extension host                                                   | UX regression monitoring           |
| `kilo.cli.security.out_of_scope_path_attempt_count` | tool path arguments rejected as outside the workspace root (lexical check)        | Extension host (permission adapter + Kilo CLI response handling) | Risk monitoring + rollback trigger |
| `kilo.cli.tools.write.allow_count`                  | write permissions granted (allow once / allow always)                             | Extension host (permission UX)                                   | Risk monitoring + rollback trigger |
| `kilo.cli.tools.write.deny_count`                   | write permissions denied                                                          | Extension host (permission UX)                                   | Risk monitoring + UX monitoring    |
| `kilo.cli.credentials.insecure_storage_detected`    | credential store does not meet best-effort hardening checks (platform-specific)   | Extension host (startup/auth flows)                              | Security diagnostics               |

Logging requirements (correlation + sanitization):

- All Kilo CLI-backed logs (including SSE errors/reconnect attempts and "unknown event" logs) MUST include correlation fields:
    - `taskId`, Kilo CLI `sessionId` (when available), `workspaceFolder`/project root, server `port`.
- Any logs derived from Kilo CLI server stdout/stderr MUST be treated as untrusted and MUST be sanitized/redacted (align with credential guardrails under Decision 3):
    - redact secrets,
    - cap line length and overall volume,
    - avoid emitting raw multi-line payloads.

---

## Data & state ownership (Decision required later)

Multiple parity requirements depend on task/session history, editing, and restore semantics (see [`docs/opencode-core/chat-ui-features/message-editing-management.md`](chat-ui-features/message-editing-management.md:1) and [`docs/opencode-core/chat-ui-features/checkpoint-task-management.md`](chat-ui-features/checkpoint-task-management.md:1)). The migration must choose a single “source of truth” model.

This section does **not** decide the model; it documents options and consequences.

### Decision — Hard cutover: no migration of legacy Kilo tasks/sessions

Decision:

- **No migration**: legacy Kilo tasks/sessions are **not imported into Kilo CLI**.

User-visible behavior:

- After cutover, **new Kilo CLI-backed tasks start fresh** (no prior Kilo history appears in the Kilo CLI-backed timeline).
- What UI/backends (if any) remain available to view **legacy task history** is **out of scope** for this plan unless explicitly decided elsewhere.

Feature flag / rollback behavior:

- The feature flag only controls which backend is used for **new tasks**.
- Turning the feature flag **off** routes new tasks to the **legacy backend**; it does **not** migrate Kilo CLI task history back into legacy.
- Turning the feature flag **on again** starts fresh Kilo CLI-backed tasks; it does **not** import legacy tasks/sessions.

### Option A — Kilo CLI owns session history (Kilo CLI = source of truth)

Consequences:

- Kilo tasks map to Kilo CLI session IDs; persistence primarily lives in Kilo CLI’s store.
- On server restart, history continuity depends on Kilo CLI session persistence guarantees.
- Message edit/delete/fork/revert must be expressed via Kilo CLI session operations (if supported) or via “fork and replace” semantics.

Risks:

- User-visible regressions if Kilo CLI cannot express Kilo’s editing/restore affordances.
- **Hard cutover risk**: legacy tasks are not imported into Kilo CLI, so users lose continuity across the cutover boundary.

### Option B — Kilo owns history (Kilo = source of truth; Kilo CLI = compute)

Consequences:

- Kilo persists canonical history; Kilo CLI sessions can be ephemeral.
- Editing/undo can be local-first, but requires robust “replay” or “re-prompt” mapping into Kilo CLI.
- Server restart is less user-visible, but adapter complexity increases.

Risks:

- Dual-source drift if Kilo CLI also persists and the adapter must reconcile.
- Harder to support Kilo CLI-native features like server-side diffs/fork history.

### Option C — Hybrid (shared persistence with explicit sync rules)

Consequences:

- Requires a well-defined sync protocol and conflict resolution.
- Highest engineering complexity; highest risk of “weird edge cases.”

Risks:

- Failure modes are hard to reason about and test.

### Decision checklist (to resolve later)

- Canonical ID mapping: `taskId` ↔ `sessionId` persistence and lifecycle.
- “What happens on restart” user story: recover, resume, or require restart.
- Editing semantics: true edit-in-place vs fork/replace vs deny in some phases.

## 1) Target architecture (responsibility split)

### Decision 6 — Parallel sessions & multi-root routing (implemented)

This plan assumes the following architecture choices are already made:

- **Concurrency model**: **one shared Kilo CLI server instance per workspace** (extension runtime).
    - The extension spawns a single Kilo CLI server process when it activates (or on first Kilo CLI-backed task).
    - All tasks/sessions within that workspace share the same server instance.
    - The extension subscribes to [`GET /event`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:274) once per workspace and **filters incoming SSE events by `sessionID`** to route them to the correct task.
    - This is feasible because **all session-related Kilo CLI events include a `sessionID` field** in their payload (e.g., `message.updated`, `message.part.updated`, `permission.updated`, `session.status`, `todo.updated`, etc.).
- **Multi-root policy**: **multi-root workspaces are supported**.
    - Each VS Code workspace folder maps to an Kilo CLI "project".
    - Tasks are **scoped to a single workspace folder/project** (tools, file access, indexing, and safety checks are evaluated relative to that folder).

### Webview (React UI)

- Remains the presentation layer.
- Continues sending user intents to the extension host through [`src/core/webview/webviewMessageHandler.ts`](../src/core/webview/webviewMessageHandler.ts:111).
- Renders streaming output, tool/permission prompts, status, diffs.

### Extension host (VS Code extension runtime)

- Becomes the _single_ client of the Kilo CLI server (no direct webview → server calls).
- Responsibilities:
    1. **Bundled server lifecycle**: spawn/health-check/restart the Kilo CLI server instance (localhost only), **one per workspace**.
    2. **Transport & adaptation**: translate Kilo CLI sessions/messages/events into Kilo UI state updates.
    3. **Session-based event routing**: filter SSE events by `sessionID` to route updates to the correct task.
    4. **Permission UX**: surface Kilo CLI permission requests using existing approval UX via [`Task.ask()`](../src/core/task/Task.ts:1185) semantics and respond back to Kilo CLI.
    5. **VS Code-only integrations**: notifications, diff views, file opens, etc.

Lifecycle / resource notes (required implications of Decision 6):

- **Port management**: the workspace-scoped server instance binds to a single localhost port.
    - Prefer an **ephemeral port** selected at runtime.
    - The extension maintains workspace-level server state: `{ process, baseUrl, password }`.
- **Session management**: the extension maintains a `{ taskId → sessionId }` mapping for event routing.
    - On new task, create a session via `POST /session` and store the mapping.
    - On task end (success, user cancel, or error), the session can remain in Kilo CLI (for history) but the extension stops routing events for it.
- **SSE connection management**: the extension owns a single SSE connection per workspace.
    - Subscribe to [`GET /event`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:274) once when the server is ready.
    - Filter incoming events by `sessionID` and dispatch to the appropriate task handler.
    - Cleanup: close the SSE connection on extension deactivation.
- **Process management**: the extension owns start/stop/restart semantics for the workspace server.
    - On extension deactivation or workspace close, terminate the server process.
- **Failure isolation**: a server crash or hang affects **all tasks in the workspace**.
    - The extension should surface an error to all active tasks and attempt to restart the server.
    - On successful restart, active tasks can attempt to resume via session rehydration (Decision 7).
- **Resource efficiency**: parallel tasks share a single server process.
    - Lower memory/CPU overhead compared to per-task processes.
    - Server startup cost is paid once per workspace, not per task.

### Kilo CLI server (bundled background process)

- Owns the agent runtime.
- Under Decision 6, the extension spawns **one Kilo CLI server instance per workspace**, shared across all tasks/sessions in that workspace.

Workspace-scoped instance requirements:

- The server instance:
    - is started with the workspace folder mapped as the Kilo CLI "project" root,
    - binds to `127.0.0.1`/localhost only,
    - is protected by `KILO_SERVER_PASSWORD` ([`Auth`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:36)), and
    - exposes a single SSE stream that the extension subscribes to for all tasks (filtering by `sessionID`).

Kilo CLI API surface used by the instance:

- Owns the agent runtime:
    - Session/message model: endpoints described under [`Sessions`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:145) and [`Messages`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:170).
    - Streaming/event bus via SSE: [`GET /event`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:274) and [`GET /global/event`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:89).
    - Workspace/project/files/search: [`GET /project`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:98) and file/search endpoints under [`Files`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:191).
    - Provider/auth/config: [`GET /config`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:124), [`GET /provider/auth`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:134), [`PUT /auth/:id`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:266).
    - MCP introspection/add: [`GET /mcp`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:221), [`POST /mcp`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:221).

---

## Adapter contracts (NormalizedEvent → WebviewUpdate)

The extension host is a transport + UX adapter. To make that layer testable and to prevent “it streams but the UI is wrong” regressions, define two internal contracts:

1. **NormalizedEvent**: a stable representation derived from Kilo CLI’s SSE payloads
2. **WebviewUpdate**: a stable representation aligned with the webview message protocol handled by [`src/core/webview/webviewMessageHandler.ts`](../src/core/webview/webviewMessageHandler.ts:111)

These are **internal** contracts (not public API). They exist to enable deterministic unit tests and phase gating.

### Contract: `NormalizedEvent`

Expectations:

- Derived from the Kilo CLI SSE JSON payload shape (`{ type, properties }`).
- Strictly ordered **within the workspace's SSE connection**.
- **Session filtering is required**: the adapter filters incoming events by `sessionID` to route them to the correct task handler. All session-related Kilo CLI events include a `sessionID` field in their payload.
- Carries enough data to reconstruct UI state transitions without "out-of-band" hacks.

Runtime validation & unknown-event policy (required):

- **Runtime contract validation**: SSE payloads that the adapter relies on MUST be validated at runtime using explicit type guards or schema validation (recommendations captured in [`docs/opencode-core/migration-plan-change-suggestions.md`](migration-plan-change-suggestions.md:1), derived from [`docs/opencode-core/poc-1-learnings.md`](poc-1-learnings.md:1)).
- **Unknown events**:
    - MUST increment `kilo.cli.adapter.unknown_event_type`.
    - MUST be logged at **debug** level with a redaction policy (below).
    - MUST NOT crash the task unless correctness/safety would otherwise be compromised (see fail-closed triggers).
- **Redaction policy for unknown-event logging** (assume payloads may contain secrets):
    - Log only a capped subset: `{ type, known-safe fields, payload_size }`.
    - Redact keys matching `token`, `apiKey`, `authorization`, `cookie`, `password` (case-insensitive), and any values that look like long secrets.
    - Cap payload size (e.g., first 2–8KB) and strip newlines.
- **Fail-closed triggers (Phase 3+)**: if an unknown event type is observed during permission/tool flows, treat it as a task-scoped hard error (requires user Retry) to avoid silent safety regressions.

Reconnect semantics (Decision 7):

- **Ordering guarantees only apply within a single SSE connection.** After a disconnect/reconnect, the adapter must assume it may see repeated or missing deltas relative to the prior connection.
- Therefore the adapter must treat reconnect as a **refresh boundary**: discard partial UI state and rehydrate from the authoritative REST endpoints under [`Sessions`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:145) and [`Messages`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:170) before rendering further deltas.

Suggested shape (illustrative):

```ts
type NormalizedEvent = {
	// Kilo CLI event discriminator (from payload `type`)
	type: string

	// Session correlation identifier (required for event routing).
	// Under Decision 6, the extension filters events by sessionId to route them
	// to the correct task handler.
	sessionId: string

	// Monotonic event ordering per session (Decision required later if Kilo CLI provides IDs)
	sequence?: number

	// Raw payload preserved for debugging and forward-compat
	raw: unknown

	// Normalized properties used by mapping logic
	properties: Record<string, unknown>
}
```

### Contract: `WebviewUpdate`

Expectations:

- Represents _UI-intentful_ updates, not raw Kilo CLI events.
- Idempotent where possible (safe to re-apply on reconnect / duplicate events).
- Designed so the webview can render without knowing Kilo CLI semantics.

Suggested shape (illustrative):

```ts
type WebviewUpdate =
	| { kind: "assistantDelta"; taskId: string; messageId: string; delta: string }
	| {
			kind: "toolState"
			taskId: string
			toolId: string
			state: "pending" | "running" | "done" | "error"
			metadata?: Record<string, unknown>
	  }
	| {
			kind: "permissionRequest"
			taskId: string
			permissionId: string
			prompt: string
			options: Array<{ label: string; value: string }>
	  }
	| { kind: "status"; taskId: string; level: "info" | "warning" | "error"; text: string }
```

Implementation note: the adapter should translate `NormalizedEvent[]` into a stream of `WebviewUpdate` messages that are posted through the same pathways already used by the webview message handler.

---

## 2) Streaming/events mapping (Kilo chunk stream → Kilo CLI SSE)

### Current behavior

- LLM streaming is consumed in the imperative loop:
    - [`Task.startTask()`](../src/core/task/Task.ts:1850) → [`Task.initiateTaskLoop()`](../src/core/task/Task.ts:2457) → [`Task.recursivelyMakeClineRequests()`](../src/core/task/Task.ts:2492)
    - Provider abstraction: [`ApiHandler.createMessage()`](../src/api/index.ts:60)

### Target behavior

- The extension host manages a **single Kilo CLI server instance per workspace** (Decision 6):
    - Starts the server when the extension activates (or on first Kilo CLI-backed task).
    - Subscribes to SSE via [`GET /event`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:274) once for the workspace.
- For each Kilo CLI-backed task:
    - Creates a new session via `POST /session` and stores the `taskId → sessionId` mapping.
    - Sends user input using `POST /session/:id/message` (or `POST /session/:id/prompt_async`) as documented in [`Messages`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:170).
    - Filters incoming SSE events by `sessionID` to route updates to the correct task handler.
    - Converts Kilo CLI events into the same kinds of incremental UI updates currently driven by `Task` streaming.

Implication: the adapter implements **session-based event routing** by filtering on `sessionID`. All session-related Kilo CLI events include this field.

**Key rule**: webview never connects to Kilo CLI directly (avoids CORS/auth leakage, centralizes trust boundary).

### Reconnect handling (Decision 7 — Policy C: Refresh-on-reconnect)

Contract:

1. **Disconnect/reconnect is treated as a refresh boundary.** The client must not attempt to “patch up” the UI by de-duplicating deltas across connections.
2. On reconnect, the extension host must:
    - pause/stop applying incremental SSE-derived updates to the webview,
    - rehydrate the full session state from Kilo CLI’s REST APIs under [`Sessions`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:145) and [`Messages`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:170), and
    - then resume consuming live deltas from [`GET /event`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:274).
3. If the extension host **cannot fully rehydrate** (endpoint missing, error response, incompatible schema, etc.), it must surface a **hard error** for that task with a user-visible **Retry** action.

Why this exists:

- The Kilo CLI SSE stream may not provide strong guarantees about event IDs or replay windows across reconnect.
- The refresh-on-reconnect policy gives a deterministic UI contract without requiring cross-connection de-duplication.

---

## 3) Tools + permissions strategy: Kilo CLI executes tools locally

### Kilo CLI executes tools locally

- Kilo CLI server runs with access to the repo/workspace.
- When it needs confirmation, it emits permission events; extension host prompts user and responds via:
    - `POST /session/:id/permissions/:permissionID` (listed under [`Sessions`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:145)).

Pros: real backend replacement; tool orchestration lives server-side.

Risk: must validate Kilo CLI’s sandboxing/workspace boundary equals or exceeds Kilo’s safety.

Implementation notes (what changes in Kilo):

- The extension host becomes a **transport + UX adapter** only:
    - forward user prompts to Kilo CLI
    - translate SSE events into Kilo UI messages
    - display permission prompts and return the user decision to Kilo CLI
- Tool execution happens inside the Kilo CLI server process (with repo/workspace access), so the **trust boundary moves**.

Decision 4 (policy):

- **Phase 3 enables workspace writes** as soon as permission bridging works, **behind the normal approval flow**.
- **Hardening baseline (initial risk acceptance): lexical containment only**.
    - This is **not a symlink-safe boundary**: a path that is lexically “within” the workspace may resolve (via symlinks/mounts) outside.
    - Windows path semantics are tricky (drive letters, UNC paths, case-insensitivity). This baseline must be documented with explicit caveats.

Operational note:

- We may still stage tool capabilities by configuration/allowlist for rollout safety, but **writes are allowed in Phase 3** and are not gated on completing deeper sandbox hardening.

### Decision 5 — Browser tooling: disable browser automation/session controls for Kilo CLI-backed sessions (Phase 2 MVP)

Decision:

- **Browser automation and browser session controls are out-of-scope for Phase 2 MVP parity** when the task/session is Kilo CLI-backed.
- The webview UI **must hide/disable browser session controls** for Kilo CLI-backed sessions (no “enabled-looking” affordances).

Interim behavior (Phase 2 MVP):

- **URL ingestion uses Kilo CLI’s existing “web fetch” capability** (Kilo CLI performs the fetch as part of its normal toolchain).
- There is **no browser session lifecycle** (no persistent browser state; no start/stop/reset/keep-alive semantics).

Notes:

- This is an intentional Phase 2 non-parity choice to avoid a hybrid “extension-owned browser tooling” path while the migration is still validating core Kilo CLI session/message/SSE behavior.
- Legacy (non-Kilo CLI) sessions may continue to use the existing Kilo browser toolchain; this decision only constrains **Kilo CLI-backed** sessions.

### MCP ownership (Decision 2: Kilo CLI backend owns MCP)

For Kilo CLI-backed runtime, MCP must have a single system of record.

Decision:

- **Kilo CLI owns MCP**: MCP server registry, connection lifecycle, OAuth handling, and MCP tool execution are handled by the Kilo CLI backend.
- **Extension host role is UI + configuration only** for MCP in Kilo CLI-backed runtime:
    - surface install/enable/disable and configuration UX, and
    - call Kilo CLI MCP endpoints for all operations (e.g., [`GET /mcp`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:221), [`POST /mcp`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:221)).

Guardrail / non-goal:

- **No parallel MCP stacks for Kilo CLI-backed sessions.** When the Kilo CLI backend is enabled for a task/session, Kilo must not run or route through the extension-owned MCP hub in parallel. The legacy hub (see [`src/services/mcp/McpHub.ts`](../src/services/mcp/McpHub.ts:1)) may remain for legacy (non-Kilo CLI) sessions, but it is **bypassed/disabled** for Kilo CLI-backed runtime.

### Credential storage (Decision 3: accept Kilo CLI plaintext storage for CLI interoperability)

Decision:

- The Kilo CLI-backed runtime will use **Kilo CLI’s credential storage mechanism** for provider credentials so that the VS Code extension and the Kilo CLI share the same auth/config state.
- This means **plaintext JSON on disk**, with **best-effort file permissions** (e.g., `chmod 0600` on POSIX where applicable), as documented in [`docs/opencode-core/unknowns/7-8-auth-credential-storage.md`](unknowns/7-8-auth-credential-storage.md:1).

Security guardrails (required):

- **No plaintext secrets in logs/telemetry**: never log the credential file contents or provider tokens; redact in error messages and debug output.
- **Best-effort permission hardening + detection**:
    - On macOS/Linux: attempt strict file permissions on write; detect and warn if group/other-readable.
    - On Windows: treat the file as **plaintext** and do not assume `chmod` semantics; detect obviously unsafe locations/permissions where possible and surface a warning.
- **User-facing risk acknowledgement**, especially for Windows:
    - Plaintext at-rest secrets are acceptable for this migration by explicit decision, but they are still a **real risk** (malware, shared accounts, unmanaged endpoints).
    - Documentation must recommend OS-level mitigations: disk encryption, OS user separation, and avoiding roaming profiles/shared home directories where feasible.
- **Operational containment**:
    - Credential files must live in the Kilo CLI config directory (not in the workspace/repo).
    - Never copy credentials into task transcripts, chat history exports, or checkpoints.

---

## 4) Migration phases (step-by-step) with decision points, risks, rollback

### Phase 0 — Contract discovery & compatibility assessment

Deliverables:

- Snapshot the OpenAPI spec from [`GET /doc`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:71).
- Capture real SSE payload samples from [`GET /event`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:274) / [`GET /global/event`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:89).
- Confirm session creation semantics and **session-based SSE event filtering** (Decision 6).
- Confirm locale/translation strategy alignment and where Kilo CLI expects locale input (see [`docs/opencode-core/non-agent-features/localization-and-locale-alignment.md`](non-agent-features/localization-and-locale-alignment.md:1)).

Acceptance criteria (pass/fail):

- PASS if we have evidence-backed answers (from OpenAPI + captured fixtures) for:
    - event payload shape(s) and ordering constraints
    - SSE connection behavior (connect/auth/heartbeat/reconnect)
    - `sessionID` field presence in all session-related events (required for event routing)
    - abort terminal events and reconnect behavior
- FAIL if abort/reconnect semantics are too ambiguous to implement a coherent UI, or if session-based event filtering cannot be made reliable.

Telemetry signals (minimum):

- `kilo.cli.adapter.unknown_event_type` (fixture replay should produce 0 unknown types in unit tests)

Test expectations:

- Unit tests can replay captured SSE fixtures deterministically (no network).

Rollback triggers:

- N/A (no user-visible change)

Decision points:

- Does Kilo CLI emit any events not tied to the active session (relevant only if we ever run multiple sessions in one instance)?
- How does Kilo CLI represent “permission needed” in events?
- Multi-root workspace routing: **Decision 6 implemented (multi-root supported; tasks scoped to folder/project).**

Rollback: N/A (no user-visible changes).

### Phase 1 — Bundled Kilo CLI server bootstrap (feature-flagged)

Deliverables:

- Extension-managed **workspace-scoped server process** with:
    - localhost binding
    - password protection via `KILO_SERVER_PASSWORD` ([`Auth`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:36))
    - health checks via [`GET /config`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:124)
    - automatic restart on crash
- SSE subscription management:
    - single SSE connection per workspace
    - event routing by `sessionID` to task handlers

Acceptance criteria (pass/fail):

- PASS if:
    - the extension can start the server and complete a health check within a bounded timeout
    - the extension can create **multiple sessions** on the same server instance
    - SSE events include `sessionID` and can be reliably routed to the correct task
    - auth failures surface as a clear user error (no infinite retries)
    - crash/restart behavior does not wedge the extension host
- FAIL if:
    - server bootstrap fails on any supported OS (macOS/Linux/Windows) in smoke tests, or
    - auth/health failure states cannot be recovered from without restarting VS Code.

Telemetry signals (minimum):

- `kilo.cli.server.crash_count`
- `kilo.cli.sse.auth_failures` (if SSE is part of the bootstrap smoke)

Test expectations:

- Integration tests that spawn the bundled server and validate:
    - health checks
    - failure mode messaging for bad credentials

Rollback triggers:

- Crash loop threshold exceeded (example: >3 crashes in 10 minutes) → disable Kilo CLI backend by default for new tasks.

    Decision points:

    - Packaging/distribution is **Decision 8 (implemented)**: extension bundles Kilo CLI as a Node bundle and runs it in lockstep (see Appendix A).
    - Port selection (fixed vs ephemeral with discovery).

    Operational requirement:

    - Implement session cleanup: when a task ends, stop routing events for that session (server process persists for other tasks in the workspace).

Rollback:

- Feature flag off reverts to legacy backend.

### Phase 2 — MVP: “Kilo CLI-backed chat”

Deliverables:

- Task-to-session mapping: on new Kilo task, create a new Kilo CLI session via `POST /session` and store the `taskId → sessionId` mapping for event routing.
- Send message via `POST /session/:id/message` (see [`Messages`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:170)).
- Render streamed output by consuming SSE from [`GET /event`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:274).
- Cancel/stop maps to `POST /session/:id/abort` (listed under [`Sessions`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:145)).

Notes:

- Even though Model A is selected, this phase can ship **before** tool execution/permissions are enabled end-to-end; it validates:

    - server lifecycle + auth
    - session/message semantics
    - SSE parsing/reconnect

- **Hard cutover**: Kilo CLI-backed tasks start with fresh Kilo CLI sessions. Legacy Kilo tasks/sessions are **not imported**.

Acceptance criteria (pass/fail):

- PASS if:
    - parallel tasks behave independently: running two Kilo CLI-backed tasks (sessions) concurrently on the same server instance does not interfere (validated by automated parallel-task integration test)
    - SSE events are correctly routed by `sessionID` to the appropriate task handler
    - reconnect does not wedge UI; after reconnect, streaming resumes or ends in a terminal state
    - stop/abort results in a consistent terminal UI state (no “forever streaming”)
    - browser session controls are **hidden/disabled** for Kilo CLI-backed sessions (Decision 5), and URL ingestion relies on Kilo CLI’s existing “web fetch” capability (no browser session lifecycle in Phase 2 MVP)
- FAIL if:
    - cross-talk occurs,
    - reconnect loops indefinitely without surfacing an error, or
    - abort/stop yields inconsistent UI state.

Telemetry signals (minimum):

- `kilo.cli.chat.ttft_ms`
- `kilo.cli.sse.reconnect_count`
- `kilo.cli.adapter.unknown_event_type`

Test expectations:

- Unit tests: SSE parsing + delta assembly using recorded fixtures.
- Integration tests: send/stream/abort on a real server instance.
- Integration tests: run two tasks concurrently (two sessions on the same server instance) and validate event routing isolation + cleanup.

Rollback triggers:

- Any confirmed cross-talk (events routed to wrong task) → immediate rollback to legacy backend for new tasks.
- P95 `kilo.cli.chat.ttft_ms` regression beyond NFR budget across a release window → default flag-off for new tasks.

Risks:

- Dual “source of truth” for history (Kilo persistence vs Kilo CLI session storage).

Rollback:

- Route new tasks back through legacy `Task` loop and [`ApiHandler.createMessage()`](../src/api/index.ts:60).

### Phase 3 — Permission bridging

Deliverables:

- Detect permission requests from SSE.
- Surface via the existing approval UX concept (currently implemented by [`Task.ask()`](../src/core/task/Task.ts:1185) and webview ask responses).
- Respond to Kilo CLI via `POST /session/:id/permissions/:permissionID` (see [`Sessions`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:145)).

- **Decision 4: writes allowed in Phase 3 (C1)**

    - As soon as permission bridging works, **workspace writes are allowed** behind the same approval UX (“Allow once”, “Allow always”, “Deny”).
    - Baseline path boundary is **lexical containment only** (see limitations below).

- Enable a **minimal tool capability set** on the server (recommended ordering):
    1. read-only file/search/project inspection
    2. diff generation / patch previews
    3. workspace writes (**allowed in Phase 3** behind normal approvals)

Explicit limitations (initial hardening baseline):

- Kilo CLI’s workspace boundary is **lexical containment**, which is **not a symlink-safe boundary**. This risk is accepted for Phase 3 write enablement and must be tracked via telemetry + rollback triggers.
- Windows drive semantics (drive letters, UNC paths, and case normalization) are an explicit caveat under this baseline; do not treat “lexically within root” as equivalent to “same volume/realpath.”

Follow-on deliverables (required before broadening in Phase 4):

- **Realpath-based containment** (symlink-safe boundary): evaluate `realpath()` (or equivalent) for both workspace root and candidate paths and enforce containment on resolved paths.
- **Windows drive handling**: explicit rules for drive-letter comparisons, UNC path normalization, case-insensitive comparisons, and mixed-separator inputs.
- **Security regression suite**: automated tests for path traversal, symlink escapes, mount-point edge cases, and Windows-specific path variants aligned with [`docs/opencode-core/unknowns/7-7-workspace-path-safety.md`](unknowns/7-7-workspace-path-safety.md:1).

Acceptance criteria (pass/fail):

- PASS if:
    - permission prompts correlate to the correct task/session and are shown exactly once per permission event
    - “Allow once” and “Deny” affect backend behavior deterministically
    - when tools are disabled (Phase 2), no permission UI appears
- FAIL if:
    - prompts appear for the wrong task/session,
    - acknowledging prompts has no effect, or
    - the system can enter an unrecoverable “waiting for permission” state.

Telemetry signals (minimum):

- `kilo.cli.permissions.prompt_count`
- `kilo.cli.adapter.unknown_event_type` (watch for permission-related types)
- `kilo.cli.security.out_of_scope_path_attempt_count`
- `kilo.cli.tools.write.allow_count`
- `kilo.cli.tools.write.deny_count`

Test expectations:

- Integration tests that simulate permission events and validate end-to-end unblocking.
- Security tests that attempt path traversal and symlink escapes aligned with [`docs/opencode-core/unknowns/7-7-workspace-path-safety.md`](unknowns/7-7-workspace-path-safety.md:1).

Rollback triggers:

- Permission prompt mismatch or “stuck waiting” incidents above threshold → disable permission bridging and fall back behind the flag.

- **Out-of-scope path attempt spike** (lexical rejects) above threshold → automatically **disable writes** for Kilo CLI-backed sessions (keep read-only tools if safe) and default flag-off for new tasks until investigated.
- **Any confirmed out-of-workspace access incident** (read or write via symlink/drive semantics) → immediate rollback to legacy backend for new tasks and disable Kilo CLI-backed tool execution by default for ≥1 release.

Risks:

- Permission granularity mismatch (need safe generic prompt fallback).

Rollback:

- Disable permission bridging and fall back to legacy behavior behind a flag.

### Phase 4 — Full replacement: Kilo CLI owns orchestration

Deliverables:

- Deprecate/bypass Kilo’s orchestration loop:
    - [`Task.startTask()`](../src/core/task/Task.ts:1850)
    - [`Task.initiateTaskLoop()`](../src/core/task/Task.ts:2457)
    - [`Task.recursivelyMakeClineRequests()`](../src/core/task/Task.ts:2492)
    - [`Task.attemptApiRequest()`](../src/core/task/Task.ts:4084)
- Add UI affordances mapped to Kilo CLI:
    - Diff: `GET /session/:id/diff` (see [`Sessions`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:145)).
    - Fork/revert/unrevert: endpoints listed under [`Sessions`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:145).

Acceptance criteria (pass/fail):

- PASS if:
    - the “Full parity” target is met: canonical parity docs are satisfied or explicitly re-homed with equivalent UX
    - tool lifecycle rows, diffs, and inline actions behave consistently with parity docs
- FAIL if:
    - any canonical parity doc is broken in Phase 4 without an explicit exception (**Decision required later**).

Telemetry signals (minimum):

- Continue Phase 2–3 signals; additionally track mapping errors for tool lifecycle rows (e.g., `kilo.cli.adapter.unknown_event_type`).

Test expectations:

- E2E tests for the most regression-prone flows (stop/cancel, diff viewing, permission prompts), aligned with parity docs.

Rollback triggers:

- High-severity parity regressions post-release → default back to legacy backend for new tasks for ≥1 release.

Rollback:

- Keep legacy backend for ≥1 release cycle; feature flag restores legacy for new tasks.

### Phase 5 — Cleanup

Deliverables:

- Remove double-persistence and unused legacy code paths after stability window.

Acceptance criteria (pass/fail):

- PASS if:
    - legacy backend removal does not reduce the supported feature surface
    - no legacy history migration is required (hard cutover); any user-facing messaging and/or legacy-history access policy is documented elsewhere (out of scope for this plan)
- FAIL if:
    - rollback is still required for production stability, or
    - users still rely on legacy-only behaviors.

Telemetry signals (minimum):

- Adoption: percentage of tasks using Kilo CLI backend vs legacy.

Test expectations:

- Full regression suite passes with legacy paths removed.

Rollback triggers:

- If rollback remains necessary in production, cleanup is deferred.

---

## 5) Mapping table (Kilo components → Kilo CLI endpoints)

| Kilo component                                                                                  | Role today                              | Kilo CLI equivalent                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`src/core/webview/webviewMessageHandler.ts`](../src/core/webview/webviewMessageHandler.ts:111) | UI control plane (webview → extension)  | Remains; extension becomes Kilo CLI client                                                                                                                                                                                                                                                                                                                     |
| [`src/core/webview/ClineProvider.ts`](../src/core/webview/ClineProvider.ts:1)                   | Task lifecycle + state posting          | Maps to Kilo CLI session lifecycle (create/select/list) under [`Sessions`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:145)                                                                                                                                                                                            |
| [`src/core/task/Task.ts`](../src/core/task/Task.ts:181)                                         | Agent orchestration loop + tool calling | Replaced by Kilo CLI sessions/messages + SSE                                                                                                                                                                                                                                                                                                                   |
| [`ApiHandler.createMessage()`](../src/api/index.ts:60)                                          | Provider streaming abstraction          | Superseded by Kilo CLI `POST /session/:id/message` + SSE (`/event`)                                                                                                                                                                                                                                                                                            |
| [`presentAssistantMessage()`](../src/core/assistant-message/presentAssistantMessage.ts:1)       | Tool sequencing + UI prompts            | Superseded by Kilo CLI server-side orchestration; extension only renders events + permission prompts                                                                                                                                                                                                                                                           |
| [`getEnvironmentDetails()`](../src/core/environment/getEnvironmentDetails.ts:1)                 | Inject workspace context into prompts   | Prefer server-side via Kilo CLI project/files/search endpoints (`/project`, [`Files`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:191))                                                                                                                                                                                |
| [`Task.ask()`](../src/core/task/Task.ts:1185)                                                   | User approvals                          | Respond via `POST /session/:id/permissions/:permissionID`                                                                                                                                                                                                                                                                                                      |
| [`src/services/mcp/McpHub.ts`](../src/services/mcp/McpHub.ts:1)                                 | Legacy extension-owned MCP hub          | **Bypassed/disabled for Kilo CLI-backed runtime**. Use Kilo CLI MCP endpoints instead (e.g., [`GET /mcp`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:221), [`POST /mcp`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:221)); Kilo CLI is system of record + executes MCP tools |

---

## 6) Testing/validation strategy + acceptance criteria

### Unit tests

- SSE parsing + reconnection + ordering.
- Reconnect rehydration (Decision 7): on reconnect, discard partial UI state and rebuild from Kilo CLI session/message endpoints; if rehydration fails, emit a terminal `status` error update with a Retry affordance.
- Kilo CLI client request layer (session/message/abort/permissions).
- Mapping layer: Kilo CLI events → Kilo UI message updates.

### Integration tests (extension-host level)

- Spawn bundled server, verify:
    - ready/health ([`GET /config`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:124))
    - can send a message and receive SSE events
    - abort cancels streaming
    - reconnect behavior (Decision 7): force a disconnect/reconnect and verify the webview timeline is refreshed from Kilo CLI session/message endpoints (no duplicated partial UI state)
    - rehydration failure behavior (Decision 7): simulate session/message endpoint failure and verify a hard error is shown with Retry

### Manual acceptance flows

- Start a new chat, stream response.
- Cancel mid-stream.
- Force an SSE disconnect (network drop or server restart) and confirm the UI refreshes from Kilo CLI session state on reconnect (Decision 7).
- Force rehydration failure (e.g., stop the server or break auth) and confirm the UI surfaces a hard error with a Retry action (Decision 7).
- Restart VS Code and confirm history/session continuity for **Kilo CLI-backed tasks created after the flag is enabled** (no legacy history import).
- Trigger permission request and ensure UI blocks until responded.
- View diff via `GET /session/:id/diff` in VS Code diff UI.

Acceptance criteria

1. UX parity for send/stream/stop/resume.
2. Server lifecycle resilience (crash → restart → recover to consistent state).
3. Security: localhost-only + password (per [`Auth`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:36)).
4. Reliable rollback via feature flag.
5. Hard cutover correctness: enabling/disabling the flag does **not** import or migrate legacy tasks/sessions; Kilo CLI-backed tasks start fresh.
6. Reconnect semantics (Decision 7): on reconnect, the UI refreshes from Kilo CLI session/message endpoints (discarding partial UI state).
7. Rehydration failure semantics (Decision 7): if full rehydration is not possible, the task enters a hard error state and exposes a Retry action.

---

## 7) Unknowns to verify (must confirm via OpenAPI spec + SSE samples)

These go beyond the summarized server doc and must be validated via [`GET /doc`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:71) and by capturing real SSE:

- [7.1 SSE event names & payloads](unknowns/7-1-sse-events.md) — Validate event payload shape and run-time ordering/cadence via live SSE capture.
- [7.2 `/event` scoping (directory vs session)](unknowns/7-2-event-scoping.md) — Validate that [`GET /event`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:274) is instance-wide within a single Kilo CLI server process. Under Decision 6 (one Kilo CLI instance per workspace), the extension **relies on session-based event filtering**: all session-related events must include a `sessionID` field that the adapter uses to route events to the correct task handler.
- [7.3 Basic auth behavior for SSE endpoints](unknowns/7-3-basic-auth-sse.md) — Confirm auth challenge/error behavior for SSE connections and SDK compatibility.
- [7.4 Session creation semantics (`POST /session`)](unknowns/7-4-session-creation.md) — Validate which session lifecycle events fire and their sequencing.
- [7.5 `message` vs `prompt_async`](unknowns/7-5-message-vs-prompt-async.md) — Confirm error surfacing/semantics of fire-and-forget prompting vs awaiting the response.
- [7.6 Abort semantics (`POST /session/:id/abort`)](unknowns/7-6-abort-semantics.md) — Confirm terminal events on abort and scope of cancellation.
- [7.7 Workspace/path safety](unknowns/7-7-workspace-path-safety.md) — Validate sandbox boundaries across endpoints and evaluate symlink/realpath hardening needs.
- [7.8 Provider credential storage (Decision 3)](unknowns/7-8-auth-credential-storage.md) — Validate credential persistence details across platforms (file location, permissions/ACL behavior), and ensure guardrails (no logging, warnings on insecure storage).
- [7.9 MCP semantics](unknowns/7-9-mcp-semantics.md) — Compare Kilo CLI MCP behavior/permissions with Kilo’s MCP hub + UI expectations.

---

## 8) Rollout recommendation

- **Initial rollout**: Phase 1 + Phase 2 (prove server lifecycle + SSE streaming).
- **Then**: Phase 3 (permissions + **writes allowed behind normal approvals**) as soon as permission bridging works (Decision 4). This ships with an explicit risk acceptance: **lexical containment only** (not symlink-safe; Windows drive semantics caveats).
- **Then**: Phase 4 broadening only after follow-on hardening deliverables land (realpath-based containment + Windows drive handling + security regression suite).

---

## Appendix A — Packaging, updates, and compatibility handshake

This appendix documents a minimal packaging/update strategy and defines how the extension behaves when the bundled Kilo CLI server is incompatible.

### Decision 8 — Packaging & distribution (implemented): Node bundle inside the extension (lockstep)

Decision (Mark chose **A + 1**):

- **Kilo CLI is bundled as a Node bundle inside the VS Code extension (VSIX)**.
- The extension always runs **its bundled server** and treats it as the only supported server for Kilo CLI-backed tasks.
- **Lockstep compatibility**: the extension and its bundled Kilo CLI server are pinned together.

Implications:

- **Extension updates == server updates**.
    - There is no separate “server update channel”.
    - Any server fix/upgrade ships via an extension release.
- **No external server selection**.
    - Users cannot point the extension at a user-installed Kilo CLI binary/CLI/server.
    - There is no “use system Kilo CLI” option and no per-user override for server version.
- **No multi-version handshake beyond sanity checks**.
    - Since the server is bundled, the extension does not negotiate a compatibility range with multiple server versions.
    - The extension performs only basic health/compat checks to detect corruption/mismatch (see below).

### Process model under lockstep: workspace-scoped server using the extension host's Node runtime

Under Decision 6, the extension spawns **one Kilo CLI server process per workspace**, shared across all tasks/sessions.

- On extension activation (or first Kilo CLI-backed task), the extension spawns **one Kilo CLI server process** for the workspace.
- The process is launched using the **extension host's Node runtime** (the Node runtime that VS Code uses to run extensions), and executes the **bundled** Kilo CLI server entrypoint.
- Multiple tasks share the same server process, each with its own Kilo CLI session. The extension subscribes to SSE once and routes events by `sessionID`.

### Sanity checks (minimal compatibility verification)

Even with lockstep bundling, the extension should validate that the server process it spawned is healthy and behaves as expected before routing user traffic.

Minimum checks:

- Server starts and binds to localhost successfully.
- Extension can authenticate and complete a health call via [`GET /config`](https://github.com/Kilo-Org/kilo/blob/main/packages/web/src/content/docs/server.mdx:124) within a bounded timeout.
- Response schema and required fields match expectations ("basic sanity", not a multi-version negotiation).

### Incompatibility / startup failure behavior

If the bundled server cannot be started or fails sanity checks:

- Do **not** start an Kilo CLI-backed task.
- Surface a clear error that this is an **internal incompatibility or startup failure** (not a user-selected server mismatch), including the captured failure reason (spawn error, auth failure, unexpected `/config` response).
- If the legacy backend is still present and policy allows, **fall back to the legacy backend for new tasks** (feature flag off behavior).

### Update coupling (explicitly accepted)

This approach intentionally couples updates:

- When the extension updates, the bundled Kilo CLI server updates.
- When the extension does not update, the Kilo CLI server does not update.

Residual risks to track:

- Extension bundle size growth due to bundling the server.
- (Mitigated by workspace-scoped model) Startup overhead is paid once per workspace, not per task.
- Constraints imposed by VS Code’s extension host Node runtime (Node version, platform quirks).
