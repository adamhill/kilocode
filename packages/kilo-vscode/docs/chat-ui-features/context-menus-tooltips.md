# Context Menus & Tooltips (Webview)

**Priority:** P2
**Status:** 🔨 Partial

> **Note:** For VS Code-native context menus (editor right-click, terminal right-click, code action lightbulb), see [Editor Context Menus & Code Actions](../non-agent-features/editor-context-menus-and-code-actions.md).

## What Exists

- Tooltips extensively used throughout the webview via kilo-ui `Tooltip` component (cost display, buttons, model info, copy buttons)
- Session list has right-click context menu (rename/delete) via `@kilocode/kilo-ui/context-menu`

## Remaining Work

- Right-click context menus on chat messages (copy, retry, edit, delete)
- Right-click context menus on code blocks (copy code, insert at cursor, apply diff)
- Right-click context menus on tool results
- Hover tooltips with explanatory text for all interactive buttons in the chat UI
