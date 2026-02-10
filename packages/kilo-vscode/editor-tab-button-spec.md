# Editor Title Bar Button → Open Webview in Editor Tab

## Overview

This spec describes how to add a persistent button to the VS Code **editor title bar** (the row of icons at the top-right of every editor tab). When clicked, the button opens a webview panel as a full editor tab — identical to the sidebar webview but hosted in the main editor area.

```
┌──────────────────────────────────────────────────────────────┐
│  file.ts ×    app.css ×                    [🟡 Kilo] [⚙] …  │  ← editor title bar
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    (editor content)                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

The `[🟡 Kilo]` icon in the editor title bar is what we're building.

---

## Step 1: Declare the Command in `package.json`

Add a command entry under `contributes.commands`. This defines the icon that will be shown in the editor title bar.

```jsonc
{
  "contributes": {
    "commands": [
      {
        "command": "my-extension.open",
        "title": "My Extension",
        "icon": {
          "light": "assets/icons/my-icon-light.svg",
          "dark": "assets/icons/my-icon-dark.svg",
        },
      },
    ],
  },
}
```

**Key points:**

- `icon.light` and `icon.dark` are SVG files for light/dark themes
- The `title` is shown as tooltip on hover

---

## Step 2: Place the Button in the Editor Title Bar

Add the command to the `editor/title` menu. This is what makes the icon appear in every editor tab's title bar.

```jsonc
{
  "contributes": {
    "menus": {
      "editor/title": [
        {
          "command": "my-extension.open",
          "group": "navigation",
          "when": "true",
        },
      ],
    },
  },
}
```

**Key points:**

- `"group": "navigation"` places the button in the icon row (not in the `...` overflow menu)
- `"when": "true"` makes the button **always visible** in every editor tab. You can scope it with a when-clause if needed (e.g., only show for specific file types)

---

## Step 3: Register the Command Handler

In your extension's `activate()` function, register the command and have it create a webview panel.

```typescript
import * as vscode from "vscode"

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("my-extension.open", () => {
      openInEditorTab(context)
    }),
  )
}
```

---

## Step 4: Create the Webview Panel (the Editor Tab)

This is the core function. It creates a `WebviewPanel` which appears as a new editor tab.

```typescript
async function openInEditorTab(context: vscode.ExtensionContext) {
  // Determine which column to open the panel in.
  // Open it to the right of the last visible editor.
  const lastCol = Math.max(...vscode.window.visibleTextEditors.map((e) => e.viewColumn || 0), 0)
  const hasVisibleEditors = vscode.window.visibleTextEditors.length > 0

  // If no editors are open, create a new editor group to the right
  if (!hasVisibleEditors) {
    await vscode.commands.executeCommand("workbench.action.newGroupRight")
  }

  const targetCol = hasVisibleEditors ? Math.max(lastCol + 1, 1) : vscode.ViewColumn.Two

  // Create the webview panel.
  // The first argument is a viewType identifier (used for serialization).
  // The second argument is the tab title.
  const panel = vscode.window.createWebviewPanel(
    "my-extension.TabPanel", // viewType — unique identifier
    "My Extension", // title shown on the tab
    targetCol, // which editor column to open in
    {
      enableScripts: true,
      retainContextWhenHidden: true, // keeps state when tab is not focused
      localResourceRoots: [context.extensionUri],
    },
  )

  // Set the tab icon (the small icon shown on the tab itself)
  panel.iconPath = {
    light: vscode.Uri.joinPath(context.extensionUri, "assets", "icons", "my-icon-light.png"),
    dark: vscode.Uri.joinPath(context.extensionUri, "assets", "icons", "my-icon-dark.png"),
  }

  // Set the HTML content (or delegate to your webview provider)
  panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri)

  // Optional: Lock the editor group so clicking files doesn't replace the panel
  await new Promise((r) => setTimeout(r, 100))
  await vscode.commands.executeCommand("workbench.action.lockEditorGroup")

  // Handle panel disposal
  panel.onDidDispose(
    () => {
      // Clean up resources here
    },
    null,
    context.subscriptions,
  )

  // Listen for visibility changes
  panel.onDidChangeViewState(
    (e) => {
      if (e.webviewPanel.visible) {
        // Panel became visible — refresh content if needed
      }
    },
    null,
    context.subscriptions,
  )
}
```

---

## Step 5: (Optional) Add Extra Buttons When the Panel is Active

You can add additional buttons to the editor title bar that only appear when your webview panel is active. Use the `activeWebviewPanelId` when-clause:

```jsonc
{
  "contributes": {
    "menus": {
      "editor/title": [
        {
          "command": "my-extension.newSession",
          "group": "navigation@1",
          "when": "activeWebviewPanelId == my-extension.TabPanel",
        },
        {
          "command": "my-extension.settings",
          "group": "navigation@2",
          "when": "activeWebviewPanelId == my-extension.TabPanel",
        },
      ],
    },
  },
}
```

**Key point:** The `activeWebviewPanelId` matches the `viewType` string you passed to `createWebviewPanel()`.

---

## Step 6: Provide the Webview HTML

The webview panel needs HTML content. Typically you serve a bundled React/Svelte/etc app:

```typescript
function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist", "webview.js"))
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist", "webview.css"))
  const nonce = getNonce()

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleUri}" rel="stylesheet">
    <title>My Extension</title>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`
}

function getNonce(): string {
  let text = ""
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}
```

---

## Summary of Required Assets

| File                             | Purpose                                          |
| -------------------------------- | ------------------------------------------------ |
| `assets/icons/my-icon-light.svg` | Light theme icon for the editor title bar button |
| `assets/icons/my-icon-dark.svg`  | Dark theme icon for the editor title bar button  |
| `assets/icons/my-icon-light.png` | Light theme icon for the editor tab itself       |
| `assets/icons/my-icon-dark.png`  | Dark theme icon for the editor tab itself        |

---

## Full `package.json` Snippet

```jsonc
{
  "contributes": {
    "commands": [
      {
        "command": "my-extension.open",
        "title": "My Extension",
        "icon": {
          "light": "assets/icons/my-icon-light.svg",
          "dark": "assets/icons/my-icon-dark.svg",
        },
      },
      {
        "command": "my-extension.newSession",
        "title": "New Session",
        "icon": "$(add)",
      },
      {
        "command": "my-extension.settings",
        "title": "Settings",
        "icon": "$(settings-gear)",
      },
    ],
    "menus": {
      "editor/title": [
        {
          "command": "my-extension.open",
          "group": "navigation",
          "when": "true",
        },
        {
          "command": "my-extension.newSession",
          "group": "navigation@1",
          "when": "activeWebviewPanelId == my-extension.TabPanel",
        },
        {
          "command": "my-extension.settings",
          "group": "navigation@2",
          "when": "activeWebviewPanelId == my-extension.TabPanel",
        },
      ],
    },
  },
}
```

---

## How Kilo Code Implements This

For reference, in Kilo Code:

- **Command**: `kilo-code.open` (defined in `src/package.json:298`)
- **Menu placement**: `editor/title` with `"when": "true"` (`src/package.json:415-418`)
- **Handler**: `open: () => openClineInNewTab(...)` in `src/activate/registerCommands.ts:132`
- **Panel creation**: `openClineInNewTab()` at `src/activate/registerCommands.ts:306-378`
  - Creates a `ClineProvider` (same webview provider used for the sidebar, but in `"editor"` mode)
  - Uses `vscode.window.createWebviewPanel()` with viewType `"kilo-code.TabPanelProvider"`
  - Sets tab icon, resolves the webview, and locks the editor group
- **Conditional title bar buttons**: Additional buttons (new task, history, settings) appear only when the Kilo tab is active, via `"when": "activeWebviewPanelId == kilo-code.TabPanelProvider"` (`src/package.json:394-413`)

---

## File References (Absolute Paths)

All paths from the Kilo Code monorepo root:

| File                                                                | Description                                                                                                               |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `/Users/mark/dev/kilo/kilocode-5/src/package.json`                  | Extension manifest — command declarations (line 298), `editor/title` menu (line 393), conditional buttons (lines 394–418) |
| `/Users/mark/dev/kilo/kilocode-5/src/activate/registerCommands.ts`  | Command handler registration — `open` handler (line 132), `openClineInNewTab()` function (lines 306–378)                  |
| `/Users/mark/dev/kilo/kilocode-5/src/core/webview/ClineProvider.ts` | Webview provider that resolves HTML content for both sidebar and editor tab panels                                        |
| `/Users/mark/dev/kilo/kilocode-5/src/assets/icons/kilo-light.svg`   | Light theme SVG icon used in editor title bar button                                                                      |
| `/Users/mark/dev/kilo/kilocode-5/src/assets/icons/kilo-dark.svg`    | Dark theme SVG icon used in editor title bar button                                                                       |
| `/Users/mark/dev/kilo/kilocode-5/src/assets/icons/kilo.png`         | Light theme PNG icon used on the editor tab itself                                                                        |
| `/Users/mark/dev/kilo/kilocode-5/src/assets/icons/kilo-dark.png`    | Dark theme PNG icon used on the editor tab itself                                                                         |
| `/Users/mark/dev/kilo/kilocode-5/src/package.nls.json`              | Localization strings (e.g., `%views.activitybar.title%` used as command title)                                            |
