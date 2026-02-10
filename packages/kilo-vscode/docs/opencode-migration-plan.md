# Feature Parity Plan — Kilo Code VS Code Extension (Rebuild)

## Overview

This extension is a **ground-up rebuild** of the [old Kilo Code extension](https://github.com/Kilo-Org/kilocode) using Kilo CLI as the backend. Rather than migrating the old extension's codebase, we started fresh with a Solid.js webview, a CLI server manager, and a message-based protocol between extension host and webview. This new extension lives in the [Kilo monorepo](https://github.com/Kilo-Org/kilo/tree/dev/packages/kilo-vscode).

This document tracks remaining work needed for feature parity with the old extension. Each feature links to its detailed parity requirement doc.

## Current State Summary

The rebuild has a working foundation:

- **CLI backend**: server lifecycle (spawn, port detection, auth, dispose) in [`server-manager.ts`](../src/services/cli-backend/server-manager.ts), HTTP client with 11 endpoints in [`http-client.ts`](../src/services/cli-backend/http-client.ts), SSE client with event subscriptions in [`sse-client.ts`](../src/services/cli-backend/sse-client.ts)
- **Chat UI**: message list with text/tool/reasoning parts, streaming text deltas, auto-scroll in [`ChatView.tsx`](../webview-ui/src/components/chat/ChatView.tsx) and [`MessageList.tsx`](../webview-ui/src/components/chat/MessageList.tsx)
- **Tool parts**: status icons (⏳⚙️✓✕), expandable input/output sections, status-based CSS classes in [`Message.tsx`](../webview-ui/src/components/chat/Message.tsx)
- **Prompt input**: send/abort controls in [`PromptInput.tsx`](../webview-ui/src/components/chat/PromptInput.tsx)
- **Permissions**: reject/once/always dialog with expandable tool details in [`PermissionDialog.tsx`](../webview-ui/src/components/chat/PermissionDialog.tsx)
- **Sessions**: create, list, select, load messages via [`session.tsx`](../webview-ui/src/context/session.tsx)
- **Todo pipeline**: `todo.updated` SSE event handled through KiloProvider → webview store (no rendering UI yet)
- **Auth**: full device auth flow with QR code, verification code, countdown in [`DeviceAuthCard.tsx`](../webview-ui/src/components/DeviceAuthCard.tsx)
- **Profile**: login state, balance, dashboard link, logout in [`ProfileView.tsx`](../webview-ui/src/components/ProfileView.tsx)
- **Session history**: list with relative dates in [`SessionList.tsx`](../webview-ui/src/components/history/SessionList.tsx)
- **Settings**: 14-tab sidebar navigation shell in [`Settings.tsx`](../webview-ui/src/components/Settings.tsx) (tabs are stubs)
- **Message protocol**: 28 message types in [`messages.ts`](../webview-ui/src/types/messages.ts)
- **Build pipeline**: dual esbuild (extension + webview), CLI binary provisioning in [`esbuild.js`](../esbuild.js) and [`prepare-cli-binary.mjs`](../scripts/prepare-cli-binary.mjs)

---

## Chat UI Feature Parity

| Feature | Status | Details | Backend | Priority |
|---------|--------|---------|---------|----------|
| [Auto-Approval Controls](chat-ui-features/auto-approval-controls.md) | ❌ Not started | No auto-approval toggle, scope selectors, or timeout config. Permission dialog exists but only supports per-request decisions. | CLI owns permissions; webview needs config UI | P1 |
| [Browser Session Controls](chat-ui-features/browser-session-controls.md) | ❌ Not started | No browser automation UI, action replay, or screenshot viewing in chat. | CLI-side (if browser tool exists) + webview | P3 |
| [Checkpoint & Task Management](chat-ui-features/checkpoint-task-management.md) | ❌ Not started | No checkpoint restore, navigation, or "See New Changes" diff buttons. | CLI session undo/redo/fork + extension git integration | P1 |
| [Code Block Interactions](chat-ui-features/code-block-interactions.md) | ❌ Not started | No markdown rendering, syntax highlighting, copy button, expand/collapse, or sticky buttons on code blocks. Messages render as plain text. | Webview-only | P0 |
| [Command Execution](chat-ui-features/command-execution.md) | 🔨 Partial | Tool messages render but lack expandable terminal output, abort-by-PID, exit status indicators, command pattern selectors, and syntax highlighting. | CLI executes commands; webview renders output | P0 |
| [Context Menus & Tooltips](chat-ui-features/context-menus-tooltips.md) | ❌ Not started | No right-click context menus or hover tooltips on interactive elements. | Webview-only | P2 |
| [Diff Viewing & File Operations](chat-ui-features/diff-viewing-file-operations.md) | ❌ Not started | No diff rendering, file change stats, jump-to-file, syntax-highlighted diffs, or batch approval UI. | CLI provides diff data; webview renders | P0 |
| [File Permission Dialogs](chat-ui-features/file-permission-dialogs.md) | 🔨 Partial | Basic permission dialog exists (reject/once/always). Missing batch file read approval and per-file granularity. | CLI permission model; webview UI | P1 |
| [Follow-Up Questions](chat-ui-features/follow-up-questions.md) | ❌ Not started | No suggested reply chips, click-to-submit, auto-approval countdown, or mode indicators. | Likely extension-side generation | P2 |
| [Image Handling](chat-ui-features/image-handling.md) | ❌ Not started | No image viewer, zoom/pan modal, thumbnails, file attachment support in prompt input, or image paste support. | CLI provides image data; webview renders + VS Code integration | P1 |
| [Inline Actions on Tool Messages](chat-ui-features/inline-actions-on-tool-messages.md) | 🔨 Partial | Tool parts render with status icons (⏳⚙️✓✕), expandable sections with input/output, and status-based CSS classes. Missing: jump-to-file links and inline action buttons. | CLI provides tool metadata; webview renders | P1 |
| [Mermaid Diagram Features](chat-ui-features/mermaid-diagram-features.md) | ❌ Not started | No mermaid rendering, "Fix with AI" button, copy, or open-as-PNG. Requires markdown rendering first. | Webview-only (rendering); CLI for "Fix with AI" | P2 |
| [Message Editing & Management](chat-ui-features/message-editing-management.md) | ❌ Not started | No inline editing, deletion, or timestamp display on user messages. | CLI session fork/undo for edit semantics | P1 |
| [Special Content Types](chat-ui-features/special-content-types.md) | 🔨 Partial | Reasoning blocks render (collapsible). Missing: open-markdown-preview button, MCP tool/resource rows, expandable error rows with copy. | Mixed: CLI for MCP data; webview for rendering | P1 |
| [Todo List Management](chat-ui-features/todo-list-management.md) | 🔨 Partial | `todo.updated` SSE event is handled through the full pipeline: KiloProvider → webview message → session store with `todos()` accessor. Missing: UI component to render, display, or interact with todo items. | CLI tool or extension-side feature | P2 |

---

## Non-Agent Feature Parity

| Feature | Status | Details | Backend | Priority |
|---------|--------|---------|---------|----------|
| [Agent Manager](non-agent-features/agent-manager.md) | 🔨 Partial | Panel exists but renders only `<h1>Agent Manager</h1>`. No session orchestration, parallel worktrees, or resumable sessions. | Extension orchestrates multiple CLI sessions | P1 |
| [Authentication & Enterprise](non-agent-features/authentication-organization-enterprise-enforcement.md) | 🔨 Partial | Device auth flow works. Missing: org feature flags, MDM policy enforcement. | CLI handles its auth; extension handles org/MDM | P1 |
| [Auto-Purge](non-agent-features/auto-purge.md) | ❌ Not started | No scheduled cleanup of old session/task storage. | Extension-side (storage ownership TBD) | P3 |
| [Autocomplete / Ghost](non-agent-features/autocomplete-ghost.md) | ❌ Not started | No inline editor completions, fill-in-the-middle, or chat-input autocomplete. | Extension-side (VS Code InlineCompletionProvider) | P1 |
| [Browser Automation & URL Ingestion](non-agent-features/browser-automation-url-ingestion.md) | ❌ Not started | No browser control, screenshots, or URL-to-markdown extraction. | CLI (partial); extension for browser automation | P3 |
| [Checkpoints](non-agent-features/checkpoints.md) | ❌ Not started | No shadow git repo, per-task snapshots, restore UI, or diff viewing. Settings tab is a stub. | CLI (partial: session undo/redo); extension for git snapshots | P1 |
| [Code Actions](non-agent-features/code-actions.md) | ❌ Not started | No VS Code lightbulb/context menu integrations (explain, fix, improve). | Extension-side (VS Code CodeActionProvider) | P2 |
| [Code Reviews](non-agent-features/code-reviews.md) | ❌ Not started | No local review mode or automated AI review of uncommitted/branch changes. | CLI (partial); extension for VS Code review UX | P2 |
| [Codebase Indexing & Semantic Search](non-agent-features/codebase-indexing-semantic-search.md) | ❌ Not started | No vector indexing, semantic search, or embeddings infrastructure. | CLI has grep/glob endpoints; semantic indexing is extension or cloud | P2 |
| [Contribution Tracking](non-agent-features/contribution-tracking.md) | ❌ Not started | No AI attribution tracking, line fingerprinting, or reporting. | Extension-side | P3 |
| [Custom Commands](non-agent-features/custom-command-system.md) | ❌ Not started | No slash commands, project-level command discovery, or YAML frontmatter support. | CLI has custom commands; extension provides UI entry points | P2 |
| [Deploy & Secure Surfaces](non-agent-features/deploy-and-secure-surfaces.md) | ❌ Not started | No deploy workflows, managed indexing UI, or security review surfaces. | Extension-side | P3 |
| [Git Commit Message Generation](non-agent-features/git-commit-message-generation.md) | ❌ Not started | No AI commit message generation or VS Code Source Control integration. | Extension-side (VS Code Git API) | P2 |
| [Integrations](non-agent-features/integrations.md) | ❌ Not started | No external system integrations (GitHub, etc.) beyond basic auth. | CLI plugin system (partial); extension for IDE hooks | P3 |
| [Localization](non-agent-features/localization-and-locale-alignment.md) | ❌ Not started | No i18n or locale normalization. All UI is English-only. | Extension + webview; CLI locale mapping needed | P3 |
| [Marketplace](non-agent-features/marketplace.md) | 🔨 Partial | Placeholder view exists but is non-functional. No catalog, install, or update capabilities. | Extension-side | P2 |
| [MCP & MCP Hub](non-agent-features/mcp-and-mcp-hub.md) | ❌ Not started | No MCP configuration UI, server management, tool allowlisting, or connection status. CLI owns MCP runtime. | CLI owns MCP lifecycle; extension provides config UI | P1 |
| [Memory Bank](non-agent-features/memory-bank.md) | ❌ Not started | No `.kilocode` project documentation loading at task start. | Extension-side (file convention) | P2 |
| [Settings Sync](non-agent-features/settings-sync-integration.md) | ❌ Not started | No VS Code Settings Sync allowlist registration. Settings tabs are all stubs. | Extension-side (VS Code API) | P3 |
| [Skills System](non-agent-features/skills-system.md) | ❌ Not started | No skill discovery, management, or hot-reload in extension. | CLI has skills runtime; extension provides packaging/UI | P2 |
| [Speech-to-Text](non-agent-features/speech-to-text.md) | ❌ Not started | No voice input or streaming STT. | Webview (mic capture); CLI-compatible STT optional | P3 |
| [Terminal / Shell Integration](non-agent-features/terminal-shell-integration.md) | ❌ Not started | No VS Code terminal integration for command execution display, exit code tracking, or working directory changes. | CLI executes commands; extension provides terminal UX | P1 |

---

## Implementation Notes

### Architecture

- **Solid.js** (not React) powers the webview. JSX compiles via `esbuild-plugin-solid`. All webview components use Solid's reactive primitives (signals, createEffect, etc.).
- **Two separate esbuild builds**: extension (Node/CJS) and webview (browser/IIFE), configured in [`esbuild.js`](../esbuild.js).
- **No shared state** between extension and webview. All communication is via `vscode.Webview.postMessage()` with typed messages defined in [`messages.ts`](../webview-ui/src/types/messages.ts).
- **CLI backend owns**: agent orchestration, MCP lifecycle, tool execution, search/grep/glob, session storage, permissions runtime, custom commands, skills, and fast edits.
- **Extension owns**: VS Code API integrations (code actions, inline completions, terminal, SCM, settings sync), webview rendering, auth mediation, and any feature not supported by CLI.

### Key Differences from Old Extension

- No `Task.ts` or `webviewMessageHandler.ts` — the CLI server replaces the old in-process agent loop.
- Permissions flow through CLI's ask/reply model, not extension-side approval queues.
- Session history is CLI-managed, not stored in VS Code global state.
- MCP servers are configured and managed by the CLI, not the extension.

### Priorities Summary

| Priority | Count | Description |
|----------|-------|-------------|
| **P0** | 3 | Code blocks, command execution output, diff viewing — bare minimum for a usable chat |
| **P1** | 13 | Auto-approval, checkpoints, file permissions, image handling, inline actions, message editing, special content, agent manager, auth & enterprise, autocomplete, checkpoints (non-agent), MCP config, terminal integration |
| **P2** | 12 | Context menus, follow-ups, mermaid, todo lists, code actions, code reviews, codebase indexing, custom commands, git commit, marketplace, memory bank, skills |
| **P3** | 9 | Browser session controls, auto-purge, browser automation, contribution tracking, deploy surfaces, integrations, localization, settings sync, speech-to-text |
