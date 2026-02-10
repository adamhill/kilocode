# Review: OpenCode migration plan (backend swap) — critique and recommendations

This review covers the migration plan and all docs in its “plan set”, including:

- The plan itself: [docs/opencode-core/opencode-migration-plan.md](docs/opencode-core/opencode-migration-plan.md:1)
- All interactive parity requirements under [docs/opencode-core/chat-ui-features/](docs/opencode-core/chat-ui-features/auto-approval-controls.md:1)
- All non-agent parity constraints under [docs/opencode-core/non-agent-features/](docs/opencode-core/non-agent-features/agent-manager.md:1)
- All “unknowns” validation notes under [docs/opencode-core/unknowns/](docs/opencode-core/unknowns/7-1-sse-events.md:1)

---

## Executive summary

### What’s strong

- **Clear responsibility split and trust boundary statement**: keeping the webview as presentation-only and making the extension host the sole OpenCode client is a good default for security and maintainability ([docs/opencode-core/opencode-migration-plan.md](docs/opencode-core/opencode-migration-plan.md:69)).
- **Good phased rollout with rollback**: feature-flagged server bootstrap then an MVP that validates lifecycle + SSE before enabling tools is the right sequence for de-risking ([docs/opencode-core/opencode-migration-plan.md](docs/opencode-core/opencode-migration-plan.md:157)).
- **Parity guardrails are explicit**: treating interactive UI docs as canonical requirements reduces the chance of “backend success, product regression” ([docs/opencode-core/opencode-migration-plan.md](docs/opencode-core/opencode-migration-plan.md:7)).
- **Unknowns are enumerated and increasingly evidence-backed**: the “unknowns” section isn’t just a TODO list—it already contains code-backed findings that materially affect the adapter design, especially around SSE framing and event scoping ([docs/opencode-core/unknowns/7-1-sse-events.md](docs/opencode-core/unknowns/7-1-sse-events.md:1)).

### What’s risky

- **Trust boundary moves from extension-host tools to a bundled server process**. This is a meaningful safety model change and needs explicit policy + sandbox hardening decisions—not just a phased rollout recommendation ([docs/opencode-core/opencode-migration-plan.md](docs/opencode-core/opencode-migration-plan.md:116), [docs/opencode-core/unknowns/7-7-workspace-path-safety.md](docs/opencode-core/unknowns/7-7-workspace-path-safety.md:1)).
- **Event-to-UI mapping complexity is concentrated** in the extension host adapter. The plan is correct that this is the critical layer, but it lacks crisp contracts/acceptance criteria for “mapping correctness” (beyond manual flows) ([docs/opencode-core/opencode-migration-plan.md](docs/opencode-core/opencode-migration-plan.md:97)).
- **Several “parity requirements” docs implicitly assume Kilo-owned features** (follow-up suggestions, todo tool UI, browser tooling, Mermaid fixer). Those are likely not present in OpenCode and require explicit ownership decisions to avoid silent regressions ([docs/opencode-core/chat-ui-features/follow-up-questions.md](docs/opencode-core/chat-ui-features/follow-up-questions.md:1), [docs/opencode-core/chat-ui-features/todo-list-management.md](docs/opencode-core/chat-ui-features/todo-list-management.md:1), [docs/opencode-core/chat-ui-features/browser-session-controls.md](docs/opencode-core/chat-ui-features/browser-session-controls.md:1), [docs/opencode-core/chat-ui-features/mermaid-diagram-features.md](docs/opencode-core/chat-ui-features/mermaid-diagram-features.md:1)).

---

## Closed decisions now recorded in the plan (5–8)

The merge-conflict cleanup goal for this review is to stop treating Decisions 5–8 as “open questions” and instead track only residual implementation risk/work.

These decisions are now explicitly stated in the plan:

- **Decision 5 (Phase 2 MVP): browser session controls disabled/out-of-scope**; rely on OpenCode web fetch; hide/disable UI ([docs/opencode-core/opencode-migration-plan.md](docs/opencode-core/opencode-migration-plan.md:441)).
- **Decision 6: per-task isolated OpenCode server instance + per-task SSE subscription; multi-root supported by scoping tasks to a workspace folder/project** ([docs/opencode-core/opencode-migration-plan.md](docs/opencode-core/opencode-migration-plan.md:227)).
- **Decision 7: Policy C — refresh-on-reconnect; hard error + Retry if rehydrate fails** ([docs/opencode-core/opencode-migration-plan.md](docs/opencode-core/opencode-migration-plan.md:126)).
- **Decision 8: bundle OpenCode as a Node bundle inside the extension (lockstep); no external server selection** ([docs/opencode-core/opencode-migration-plan.md](docs/opencode-core/opencode-migration-plan.md:855)).

## Completeness gaps (decisions, NFRs, migration steps, acceptance criteria)

### 3) State model decision is now made: OpenCode owns session/task state

Multiple UI features depend on message history manipulation:

- Inline edit/delete of user messages ([docs/opencode-core/chat-ui-features/message-editing-management.md](docs/opencode-core/chat-ui-features/message-editing-management.md:1))
- Checkpoint/task restore and “See New Changes” ([docs/opencode-core/chat-ui-features/checkpoint-task-management.md](docs/opencode-core/chat-ui-features/checkpoint-task-management.md:1))

This ambiguity is resolved by choosing OpenCode as the system of record:

- OpenCode session history/state is authoritative.
- Kilo maintains a minimal, ephemeral UI cache derived from OpenCode.
- The extension host maintains a persistent mapping `kiloTaskId` ↔ `openCodeSessionId`.
- Reconnect semantics are **Decision 7 (closed)**: **refresh-on-reconnect** via full rehydration from OpenCode REST endpoints; failure to rehydrate is a **hard error + Retry**.

What remains a decision (still open):

- History migration is **not required**: the migration plan has been updated to a **hard cutover** decision (no migration/import of legacy Kilo tasks/sessions into OpenCode) ([docs/opencode-core/opencode-migration-plan.md](docs/opencode-core/opencode-migration-plan.md:164)).

---

## Technical risks & unknowns (with proposed mitigations)

### 1) SSE protocol realities vs “typical EventSource assumptions”

Key finding: OpenCode’s server-side SSE does not set an SSE event field; the logical event name is in the JSON payload’s `type` property (and the payload shape is `{ type, properties }`) ([docs/opencode-core/unknowns/7-1-sse-events.md](docs/opencode-core/unknowns/7-1-sse-events.md:1185)).

Risks:

- Incorrect adapter implementation if the client assumes browser `EventSource` semantics.
- Backpressure and UI performance issues if the adapter forwards every delta as a full render update.

Mitigations:

- Implement SSE with fetch + streaming parse (not EventSource), aligned with the finding in [docs/opencode-core/unknowns/7-3-basic-auth-sse.md](docs/opencode-core/unknowns/7-3-basic-auth-sse.md:1233).
- Define a UI update batching policy (e.g., max 20–60 updates/sec) for message.part.updated deltas ([docs/opencode-core/unknowns/7-1-sse-events.md](docs/opencode-core/unknowns/7-1-sse-events.md:1189)).
- Add deterministic unit tests using recorded SSE fixtures (see Testing section).

Note: keep the above SSE implementation recommendation even with Decision 7. Refresh-on-reconnect reduces correctness coupling to cross-connection de-duplication, but it does not eliminate the need for robust SSE parsing.

### 2) /event scoping vs chosen concurrency model

OpenCode’s [`GET /event`](docs/opencode-core/unknowns/7-2-event-scoping.md:1) is instance-wide (within a single OpenCode server process). Under Decision 6, Kilo avoids the “many sessions, one `/event` stream” correctness problem by running **one OpenCode server instance per task/session**.

Residual implementation risks (Decision 6 is closed; these are the remaining operational risks):

- **Resource usage scales with parallel tasks** (CPU/memory per OpenCode process).
- **Port management**: each per-task server needs a localhost port; avoid collisions and ensure the extension tracks `{ taskId → baseUrl }` reliably.
- **Cleanup correctness**: on task end (success/cancel/error), the extension must close SSE and terminate the task’s server process; leaks will accumulate.
- **Failure isolation behavior**: define user-facing behavior when a single task’s server crashes (task-level error + retry), without impacting other tasks.

### 3) Permissions: granularity mismatch and UX regressions

Kilo has rich approval UX including batch file approvals and auto-approval controls ([docs/opencode-core/chat-ui-features/file-permission-dialogs.md](docs/opencode-core/chat-ui-features/file-permission-dialogs.md:1), [docs/opencode-core/chat-ui-features/auto-approval-controls.md](docs/opencode-core/chat-ui-features/auto-approval-controls.md:1)). OpenCode’s permission model is queue-based and event-driven ([docs/opencode-core/unknowns/7-1-sse-events.md](docs/opencode-core/unknowns/7-1-sse-events.md:1)).

Risks:

- Batch UI becomes “fake batching” over one-by-one permissions, causing confusing state.
- Auto-approve semantics (“timeout”, “scope selectors”) may not map cleanly to OpenCode’s “remember” patterns.

Mitigations:

- Define a minimal permission abstraction that both systems can support:
    - “allow once”
    - “allow always (remember)”
    - “deny”
    - “deny always” (if supported)
- Define a UI degradation policy if OpenCode does not support a concept:
    - hide vs show disabled vs show but no-op

### 4) Tool execution trust boundary and workspace sandbox

OpenCode’s path safety is “lexical containment,” with explicit limitations around symlinks and Windows drive semantics ([docs/opencode-core/unknowns/7-7-workspace-path-safety.md](docs/opencode-core/unknowns/7-7-workspace-path-safety.md:1)).

Risks:

- The bundled server may access data outside the intended workspace via symlink escapes.
- Tool execution is not OS-sandboxed; it relies on permission evaluation and patterns.

Mitigations:

- Decision 4 (C1) accepts **enabling writes in Phase 3** behind normal approvals with a **lexical-containment-only** boundary. Mitigate this risk acceptance with explicit limitation docs (not symlink-safe; Windows drive semantics caveats), plus telemetry + rollback triggers, and follow-on hardening work before broadening in Phase 4 ([docs/opencode-core/opencode-migration-plan.md](docs/opencode-core/opencode-migration-plan.md:1)).
- Add explicit security tests (see Testing section) that attempt:
    - symlink escape reads
    - path traversal edge cases
    - multi-root vs worktree boundary confusion

### 5) Credential storage decision: accept OpenCode plaintext storage (with guardrails)

OpenCode stores provider credentials in plaintext JSON with best-effort permission hardening (e.g., chmod `0600` on POSIX) ([docs/opencode-core/unknowns/7-8-auth-credential-storage.md](docs/opencode-core/unknowns/7-8-auth-credential-storage.md:1)).

Risks:

- On Windows, chmod-based secrecy is not equivalent to keychain storage.
- If Kilo today relies on OS keychain semantics, this is a security regression.

Mitigations:

- Decision 3 chooses to **accept OpenCode’s storage mechanism as-is** for interoperability with the OpenCode CLI, with explicit guardrails and risk acknowledgement.
- What remains as _ongoing security work_ (not undecided architecture):
    - ensure no credentials are written to logs/telemetry
    - add platform-specific warnings/detection for insecure storage (especially Windows)
    - document recommended OS mitigations (disk encryption, per-user accounts)

---

### 6) Packaging & update strategy is now decided (Decision 8): bundled Node server (lockstep)

This was previously an open question; it is now closed by Decision 8 in the plan appendix ([docs/opencode-core/opencode-migration-plan.md](docs/opencode-core/opencode-migration-plan.md:850)).

Residual risks that still apply (even with the decision made):

- **Bundle size**: shipping OpenCode inside the extension may increase VSIX size and impact install/update times.
- **Startup/performance**: Decision 6 implies multiple per-task server processes; combined with bundling, this can increase CPU/memory overhead and affect TTFT or perceived responsiveness under parallel load.
- **Node runtime constraints**: running the server under the VS Code extension host’s Node runtime creates constraints on supported Node features/versions and platform quirks; treat this as a compatibility surface in Phase 1 smoke tests.

## Dependency and sequencing critique

### What must happen first (P0 sequencing dependencies)

1. **Adapter contract design before implementation**

- The plan correctly emphasizes “transport & adaptation” ([docs/opencode-core/opencode-migration-plan.md](docs/opencode-core/opencode-migration-plan.md:77)), but the work is easiest if you define contracts first:
    - Event normalization (OpenCode bus events → internal adapter event model)
    - Internal adapter event model → webview message protocol

2. **Decide state ownership before building editing/undo UX**

- Message editing management depends on whether the extension can mutate history locally or must express edits via OpenCode session operations ([docs/opencode-core/chat-ui-features/message-editing-management.md](docs/opencode-core/chat-ui-features/message-editing-management.md:19)).

3. **Security policy before enabling tool execution**

- Phase 3 proposes staged enablement; formalize it as a policy and implement enforcement at the adapter boundary ([docs/opencode-core/opencode-migration-plan.md](docs/opencode-core/opencode-migration-plan.md:200)).
    - This policy should explicitly cover **Phase 3 write enablement** (Decision 4) and the scope/limitations of the initial lexical boundary.

### What can be parallelized

- **UI-only features** can largely remain unchanged and can be validated early:

    - code block interactions ([docs/opencode-core/chat-ui-features/code-block-interactions.md](docs/opencode-core/chat-ui-features/code-block-interactions.md:1))
    - context menus/tooltips ([docs/opencode-core/chat-ui-features/context-menus-tooltips.md](docs/opencode-core/chat-ui-features/context-menus-tooltips.md:1))

- **Parity doc audits** can run in parallel with Phase 0:
    - Identify which parity docs require backend support (diffs, permissions, attachments, tool metadata) vs webview-only.

### Sequencing concerns in the current plan

- Phase 2 claims it can ship without tools/permissions. That’s plausible for pure “chat streaming,” but many interactive parity requirements are tool-driven (diff viewing, file permissions, command execution) ([docs/opencode-core/chat-ui-features/diff-viewing-file-operations.md](docs/opencode-core/chat-ui-features/diff-viewing-file-operations.md:1), [docs/opencode-core/chat-ui-features/command-execution.md](docs/opencode-core/chat-ui-features/command-execution.md:1)).

Recommendation:

- Define a strict “Phase 2 MVP feature surface” that is coherent: if permissions are off, the UI must not present permission-driven affordances as if they work.

---

## Testing strategy recommendations

### Unit tests (adapter-focused)

Add unit tests for:

- **SSE parsing and reconnection**
    - heartbeat handling and reconnect backoff ([docs/opencode-core/unknowns/7-1-sse-events.md](docs/opencode-core/unknowns/7-1-sse-events.md:1185))
    - Basic auth failures and retry behavior ([docs/opencode-core/unknowns/7-3-basic-auth-sse.md](docs/opencode-core/unknowns/7-3-basic-auth-sse.md:1226))
- **Isolation correctness (Decision 6)**
    - verify that parallel tasks do not cross-stream events (separate SSE connections per task; no shared routing layer)
- **Mapping correctness**
    - message.part.updated delta assembly into a stable message part representation ([docs/opencode-core/unknowns/7-1-sse-events.md](docs/opencode-core/unknowns/7-1-sse-events.md:1189))
    - tool part lifecycle transitions (pending → running → completed/error) into the UI state machine used by inline actions ([docs/opencode-core/unknowns/7-1-sse-events.md](docs/opencode-core/unknowns/7-1-sse-events.md:1190), [docs/opencode-core/chat-ui-features/inline-actions-on-tool-messages.md](docs/opencode-core/chat-ui-features/inline-actions-on-tool-messages.md:20))

Implementation recommendation:

- Record real SSE streams in Phase 0 and check them into test fixtures (scrub secrets). This yields stable regression tests for “adapter correctness” and avoids relying on hand-constructed event sequences.

### Integration tests (extension-host level)

The plan already calls this out; strengthen it by adding failure-mode tests:

- server crash during generation then restart, ensuring the extension does not wedge ([docs/opencode-core/opencode-migration-plan.md](docs/opencode-core/opencode-migration-plan.md:157))
- auth misconfiguration (wrong password), verifying user-friendly error and no infinite reconnect loop
- multi-task concurrent runs (two or more OpenCode processes), validating isolation and cleanup

Reconnect acceptance tests (Decision 7):

- reconnect → UI refreshes by rehydrating from OpenCode session/message endpoints (discard partial UI state)
- rehydration fails → hard error + Retry

### E2E tests (UX parity)

Given the parity-doc framing, it is worth adding e2e tests for the most regression-prone interactive surfaces:

- Stop/cancel mid-stream and ensure UI ends in a consistent state ([docs/opencode-core/opencode-migration-plan.md](docs/opencode-core/opencode-migration-plan.md:176), [docs/opencode-core/unknowns/7-6-abort-semantics.md](docs/opencode-core/unknowns/7-6-abort-semantics.md:1))
- Diff rendering and “jump to file” flows ([docs/opencode-core/chat-ui-features/diff-viewing-file-operations.md](docs/opencode-core/chat-ui-features/diff-viewing-file-operations.md:1))
- Permission prompt flows, including batching and “remember” ([docs/opencode-core/chat-ui-features/file-permission-dialogs.md](docs/opencode-core/chat-ui-features/file-permission-dialogs.md:1), [docs/opencode-core/chat-ui-features/auto-approval-controls.md](docs/opencode-core/chat-ui-features/auto-approval-controls.md:1))

---

## UX / product concerns (edge cases, accessibility, discoverability)

### 2) Keyboard navigation + a11y verification

The parity docs emphasize click interactions but do not spell out keyboard and accessibility requirements (focus trapping, ARIA labels, screen reader descriptions). This is a typical regression vector when message content and interactive widgets shift semantics.

Recommendation:

- Add explicit a11y acceptance criteria for:
    - follow-up suggestion chips ([docs/opencode-core/chat-ui-features/follow-up-questions.md](docs/opencode-core/chat-ui-features/follow-up-questions.md:1))
    - diff accordions ([docs/opencode-core/chat-ui-features/diff-viewing-file-operations.md](docs/opencode-core/chat-ui-features/diff-viewing-file-operations.md:1))
    - image viewer modal ([docs/opencode-core/chat-ui-features/image-handling.md](docs/opencode-core/chat-ui-features/image-handling.md:1))

### 3) Discoverability and user mental model

Moving from “Kilo runs tools” to “OpenCode runs tools” changes where users attribute failures.

Recommendation:

- Provide user-facing status messaging that distinguishes:
    - server not running / reconnecting
    - permission denied vs tool error
    - adapter mapping errors

---

## Implementation notes (contracts, interfaces, telemetry)

### 2) Make “capability detection” first-class

Many parity features require backend support that may not exist in OpenCode (follow-up suggestions, todo lists, browser sessions, Mermaid fixer):

- [docs/opencode-core/chat-ui-features/follow-up-questions.md](docs/opencode-core/chat-ui-features/follow-up-questions.md:1)
- [docs/opencode-core/chat-ui-features/todo-list-management.md](docs/opencode-core/chat-ui-features/todo-list-management.md:1)
- [docs/opencode-core/chat-ui-features/browser-session-controls.md](docs/opencode-core/chat-ui-features/browser-session-controls.md:1)
- [docs/opencode-core/chat-ui-features/mermaid-diagram-features.md](docs/opencode-core/chat-ui-features/mermaid-diagram-features.md:1)

Recommendation:

- Introduce a capability map (computed at runtime) that drives UI enablement and prevents misleading affordances.

### 3) Telemetry recommendations (minimum signals)

To manage risk and rollback triggers, define telemetry signals for:

- server lifecycle: starts, crashes, restarts ([docs/opencode-core/opencode-migration-plan.md](docs/opencode-core/opencode-migration-plan.md:157))
- SSE health: reconnect counts, auth failures, heartbeat misses ([docs/opencode-core/unknowns/7-1-sse-events.md](docs/opencode-core/unknowns/7-1-sse-events.md:1))
- reconnect rehydration failures (Decision 7): count cases where rehydration cannot be completed and the UI surfaces a hard error + Retry ([docs/opencode-core/opencode-migration-plan.md](docs/opencode-core/opencode-migration-plan.md:141))
- permission UX: prompt count, auto-approve usage, denial rates ([docs/opencode-core/chat-ui-features/auto-approval-controls.md](docs/opencode-core/chat-ui-features/auto-approval-controls.md:1))
- mapping errors: unknown event types encountered

---

## Concrete action items (checklist with priorities)

### P0 (must do before Phase 2 ships)

- [ ] Implement SSE client semantics aligned with [docs/opencode-core/unknowns/7-1-sse-events.md](docs/opencode-core/unknowns/7-1-sse-events.md:1) and [docs/opencode-core/unknowns/7-3-basic-auth-sse.md](docs/opencode-core/unknowns/7-3-basic-auth-sse.md:1).
- [ ] Add automated tests based on recorded SSE fixtures for delta assembly and reconnect/rehydrate behavior (Decision 7), and verify per-task isolation at the integration level (Decision 6) ([docs/opencode-core/opencode-migration-plan.md](docs/opencode-core/opencode-migration-plan.md:227)).

Residual risks under hard cutover:

- Users may expect prior Kilo tasks to appear in the OpenCode-backed timeline; mitigate with explicit UX messaging and/or documentation at cutover (owned by product/UI; out of scope for this review unless surfaced as a requirement).

### P1 (needed for Phase 3–4 safety and parity)

- [ ] Implement the follow-on tool sandbox hardening work (realpath-based containment + Windows drive handling) and a security regression suite so we can broaden beyond the initial lexical-containment baseline in Phase 4 ([docs/opencode-core/unknowns/7-7-workspace-path-safety.md](docs/opencode-core/unknowns/7-7-workspace-path-safety.md:1)).
- [ ] Implement/document credential storage guardrails for OpenCode’s plaintext auth storage (Decision 3), especially on Windows: warnings/detection + ensure no secrets in logs/telemetry ([docs/opencode-core/unknowns/7-8-auth-credential-storage.md](docs/opencode-core/unknowns/7-8-auth-credential-storage.md:1)).
- [ ] Define explicit degradation/compat behavior for command execution UI where PID/low-level details may not exist ([docs/opencode-core/chat-ui-features/command-execution.md](docs/opencode-core/chat-ui-features/command-execution.md:20)).

### P2 (polish, maintainability, product quality)

- [ ] Add explicit a11y/keyboard acceptance criteria to parity docs for complex interactive widgets (images, diffs, suggestions) ([docs/opencode-core/chat-ui-features/image-handling.md](docs/opencode-core/chat-ui-features/image-handling.md:1), [docs/opencode-core/chat-ui-features/diff-viewing-file-operations.md](docs/opencode-core/chat-ui-features/diff-viewing-file-operations.md:1), [docs/opencode-core/chat-ui-features/follow-up-questions.md](docs/opencode-core/chat-ui-features/follow-up-questions.md:1)).
- [ ] Add documentation for feature ownership post-migration (OpenCode vs extension-host vs webview-only) across all docs under [docs/opencode-core/chat-ui-features/](docs/opencode-core/chat-ui-features/code-block-interactions.md:1).
