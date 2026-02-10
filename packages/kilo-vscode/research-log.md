# Research Log: Shared Server for Editor Tab Panels

## Date: 2026-02-10

## Problem Statement

In PR #199, `openKiloInNewTab()` at `extension.ts:83` creates a brand new `KiloProvider` per tab, which spawns a separate CLI backend server process. We need to reuse the existing server but create independent sessions per tab.

---

## Finding 1: Current Architecture (Local Codebase)

### KiloProvider

- Implements `vscode.WebviewViewProvider`
- Constructor creates its own `ServerManager` instance (`this.serverManager = new ServerManager(context)`)
- State: `httpClient`, `sseClient`, `webviewView`, `webview`, `currentSession`, `serverInfo`, `connectionState`
- Two resolve methods: `resolveWebviewView()` (sidebar) and `resolveWebviewPanel()` (tab)
- Both call `initializeConnection()` which starts/connects to the server

### initializeConnection() Flow

1. `await this.serverManager.getServer()` — starts or reuses CLI process
2. Creates `HttpClient` and `SSEClient` with `{baseUrl, password}`
3. Wires SSE event handler → `handleSSEEvent()` → forwards to webview
4. Wires SSE state handler → updates connectionState, fetches profile
5. Calls `sseClient.connect(workspaceDir)`
6. Posts `"ready"` message to webview

### ServerManager

- Singleton-like internally (reuses `this.instance` if exists)
- But each KiloProvider creates its OWN ServerManager, so no sharing
- `getServer()` spawns `kilo serve --port 0` with random password
- Returns `{ port, password, process }`

### Extension Registration

- Sidebar: single `KiloProvider` instance registered via `registerWebviewViewProvider`
- Tab: `openKiloInNewTab()` creates NEW `KiloProvider` per tab (the problem)
- Toolbar buttons (plus, marketplace, etc.) only wired to sidebar provider

### SSE Event Types

- `session.created`, `session.updated`, `session.status`, `session.idle`
- `message.updated`, `message.part.updated`
- `permission.asked`, `permission.replied`
- Events are received by a single SSEClient and forwarded to its webview

### resolveWebviewPanel() vs resolveWebviewView()

- Tab panel is MISSING: `webviewReady`, `login`, `cancelLogin`, `logout`, `refreshProfile`, `openExternal` handlers
- Tab panel has reduced functionality compared to sidebar

### Webview Architecture (Solid.js)

- Three nested context providers: `VSCodeProvider → ServerProvider → SessionProvider`
- ServerProvider listens for `"ready"`, `"connectionState"`, `"profileData"` etc.
- SessionProvider manages sessions, messages, parts, todos
- Sends `"webviewReady"` on mount as handshake

---

## Finding 2: PR #182 — JetBrains Lessons Learned

PR #182 documents patterns from the JetBrains Kilo plugin:

### Three-Layer Architecture

- **Layer 1: SSE Event Source** — Single SSE connection, auto-reconnect
- **Layer 2: State Managers** — `ChatStateManager` + `AppStateManager` as separate services
- **Layer 3: UI Renderer** — Webview consumes state via postMessage

### Service Separation (JetBrains)

| Service              | Responsibility                          |
| -------------------- | --------------------------------------- |
| `KiloServerService`  | CLI process lifecycle (one per project) |
| `ChatUiStateManager` | Sessions, messages, parts, permissions  |
| `KiloAppState`       | Providers, agents, models               |
| `KiloProjectService` | Coordinates initialization              |

### Key Insight

One server per project, NOT per UI panel. Server is a shared resource. Multiple panels share the same server connection and use different sessions.

---

## Finding 3: PR #199 — Current State

### What's Implemented

1. Editor title bar button with SVG icons
2. `kilo-code.new.openInTab` command in `editor/title` menu
3. Panel placement logic (rightmost column + 1)
4. `resolveWebviewPanel()` method on KiloProvider
5. Tab toolbar buttons (plus, settings) via `activeWebviewPanelId`
6. `webview` field abstraction for postMessage

### The Problem

```
Sidebar  → new KiloProvider → new ServerManager → spawn CLI process (port X)
Tab      → new KiloProvider → new ServerManager → spawn ANOTHER process (port Y)
```

Each tab spawns its own CLI server process. Wasteful and prevents shared state.

---

## Architectural Approach for Fix

### Core Idea

Extract the server connection (ServerManager + HttpClient + SSEClient) to be a shared singleton created at extension activation. Each KiloProvider (sidebar or tab) receives the shared connection but maintains its own session state.

### Key Changes Needed

1. **Shared ServerManager** — Create once in `activate()`, pass to all providers
2. **Shared HttpClient + SSEClient** — Single connection to the server
3. **SSE Event Broadcasting** — Single SSE stream → broadcast to all registered webviews
4. **Per-webview Session Filtering** — Each webview tracks its own `currentSessionId`, filters events
5. **Complete tab message handlers** — Add missing handlers to `resolveWebviewPanel()`
