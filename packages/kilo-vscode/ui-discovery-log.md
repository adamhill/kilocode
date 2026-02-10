# UI Discovery Log

## Agent 1: kilo-vscode Webview UI Analysis

### File Structure

```
kilo-vscode/webview-ui/
├── tsconfig.json
└── src/
    ├── index.tsx                          # Entry point – renders <App />
    ├── App.tsx                            # Root component with providers & view routing
    ├── components/
    │   ├── DeviceAuthCard.tsx             # Device-auth flow (QR code, code entry, states)
    │   ├── ProfileView.tsx               # Profile / login / balance view
    │   ├── Settings.tsx                  # Settings shell: sidebar tabs + content area
    │   ├── chat/
    │   │   ├── index.ts                  # Barrel export
    │   │   ├── ChatView.tsx              # Main chat layout (messages + input + permissions)
    │   │   ├── Message.tsx               # Single message renderer (text / tool / reasoning parts)
    │   │   ├── MessageList.tsx           # Scrollable message list with auto-scroll
    │   │   ├── PermissionDialog.tsx      # Modal overlay for tool permission requests
    │   │   └── PromptInput.tsx           # Textarea + send/abort buttons
    │   ├── history/
    │   │   └── SessionList.tsx           # Session history list
    │   └── settings/                     # 14 settings tab components (all stubs)
    │       ├── index.ts
    │       ├── AboutKiloCodeTab.tsx
    │       ├── AgentBehaviourTab.tsx
    │       ├── AutoApproveTab.tsx
    │       ├── AutocompleteTab.tsx
    │       ├── BrowserTab.tsx
    │       ├── CheckpointsTab.tsx
    │       ├── ContextTab.tsx
    │       ├── DisplayTab.tsx
    │       ├── ExperimentalTab.tsx
    │       ├── LanguageTab.tsx
    │       ├── NotificationsTab.tsx
    │       ├── PromptsTab.tsx
    │       ├── ProvidersTab.tsx
    │       └── TerminalTab.tsx
    ├── context/
    │   ├── vscode.tsx                    # VSCode API bridge (postMessage, onMessage, state)
    │   ├── server.tsx                    # Server connection state, profile, device auth
    │   └── session.tsx                   # Session/message/parts store (solid-js/store)
    ├── styles/
    │   └── chat.css                      # Single CSS file (~552 lines) for all chat + session UI
    ├── types/
    │   └── messages.ts                   # All message types between extension ↔ webview
    └── utils/
        └── qrcode.ts                     # QR code generation wrapper (uses `qrcode` library)
```

### Entry Point and App Structure

- **Framework**: [Solid.js](https://www.solidjs.com/) v1.9.11 (`solid-js`, with `solid-js/store` for state)
- **Entry point**: [`index.tsx`](kilo-vscode/webview-ui/src/index.tsx) — calls `render(() => <App />, root)` on `#root`
- **Provider hierarchy** (in [`App.tsx`](kilo-vscode/webview-ui/src/App.tsx)):
  ```
  VSCodeProvider → ServerProvider → SessionProvider → AppContent
  ```
- **View routing**: Manual signal-based routing via `createSignal<ViewType>` in [`AppContent`](kilo-vscode/webview-ui/src/App.tsx:32). View switching triggered by `action` messages from the extension host.
  - Views: `newTask` (chat), `marketplace` (dummy), `history`, `profile`, `settings`
  - Uses Solid's `<Switch>/<Match>` for conditional rendering
- **No router library** — all navigation is message-driven from VS Code extension commands

### Current Components Inventory

| Component | File | Description | Status |
|-----------|------|-------------|--------|
| `ChatView` | [`ChatView.tsx`](kilo-vscode/webview-ui/src/components/chat/ChatView.tsx) | Main chat layout: messages area + input + permission overlay | Functional |
| `MessageList` | [`MessageList.tsx`](kilo-vscode/webview-ui/src/components/chat/MessageList.tsx) | Scrollable list with auto-scroll, scroll-to-bottom button | Functional |
| `Message` | [`Message.tsx`](kilo-vscode/webview-ui/src/components/chat/Message.tsx) | Renders user/assistant messages with sub-parts (text, tool, reasoning) | Functional |
| `TextPartView` | [`Message.tsx`](kilo-vscode/webview-ui/src/components/chat/Message.tsx:15) | Plain text display | Functional |
| `ToolPartView` | [`Message.tsx`](kilo-vscode/webview-ui/src/components/chat/Message.tsx:38) | Expandable tool call with status icon, input/output/error | Functional |
| `ReasoningPartView` | [`Message.tsx`](kilo-vscode/webview-ui/src/components/chat/Message.tsx:20) | Expandable thinking/reasoning block | Functional |
| `PromptInput` | [`PromptInput.tsx`](kilo-vscode/webview-ui/src/components/chat/PromptInput.tsx) | Auto-resizing textarea with send/abort SVG buttons | Functional |
| `PermissionDialog` | [`PermissionDialog.tsx`](kilo-vscode/webview-ui/src/components/chat/PermissionDialog.tsx) | Modal overlay with reject/once/always buttons | Functional |
| `SessionList` | [`SessionList.tsx`](kilo-vscode/webview-ui/src/components/history/SessionList.tsx) | History list with relative date formatting | Functional |
| `ProfileView` | [`ProfileView.tsx`](kilo-vscode/webview-ui/src/components/ProfileView.tsx) | Login state, user profile card, balance display | Functional |
| `DeviceAuthCard` | [`DeviceAuthCard.tsx`](kilo-vscode/webview-ui/src/components/DeviceAuthCard.tsx) | Multi-state device auth flow (QR, code, timer, success/error) | Functional |
| `Settings` | [`Settings.tsx`](kilo-vscode/webview-ui/src/components/Settings.tsx) | Settings shell with sidebar tab navigation | Functional (shell only) |
| `DummyView` | [`App.tsx`](kilo-vscode/webview-ui/src/App.tsx:13) | Placeholder view for unimplemented sections | Stub |
| 14 Settings tabs | `settings/*.tsx` | All stub/placeholder — display "not implemented yet" message | Stubs |

### Current Styling Approach

**Two approaches are used side-by-side:**

1. **CSS classes** (in [`chat.css`](kilo-vscode/webview-ui/src/styles/chat.css)):
   - Single file with ~552 lines covering all chat, message, prompt, permission, and session list styles
   - Uses VS Code CSS custom properties extensively (`--vscode-foreground`, `--vscode-panel-border`, `--vscode-button-background`, etc.)
   - Organized into clearly commented sections
   - Applied to: `ChatView`, `MessageList`, `Message`, `PromptInput`, `PermissionDialog`, `SessionList`

2. **Inline `style={{ }}` objects** (Solid.js style):
   - Used heavily in: `Settings.tsx`, `ProfileView.tsx`, `DeviceAuthCard.tsx`, and the `DummyView`
   - Also reference VS Code CSS variables via `var(--vscode-*)` strings
   - Contain hardcoded pixel values, colors, and layout properties

**No CSS modules, no Tailwind, no CSS-in-JS library** — just raw CSS file + inline styles.

**Theming**: Entirely dependent on VS Code's built-in CSS custom properties (e.g., `--vscode-foreground`, `--vscode-editor-background`, `--vscode-button-background`). No custom theme system.

### Current Library Dependencies (used in webview)

| Dependency | Version | Usage |
|-----------|---------|-------|
| `solid-js` | ^1.9.11 | UI framework (signals, components, stores) |
| `solid-js/store` | (bundled) | Reactive store for session/messages/parts state |
| `lucide-solid` | ^0.563.0 | Icon library — used **only** in `Settings.tsx` for tab icons (14 icons) |
| `qrcode` | ^1.5.4 | QR code generation in `DeviceAuthCard` |
| `esbuild-plugin-solid` | ^0.6.0 | Build-time Solid.js JSX transform |

**No component library is used.** All UI components (buttons, dialogs, cards, inputs, lists, tabs) are built from scratch with raw HTML elements + inline styles or CSS classes.

### Opportunities for kilo-ui Adoption

The `kilo-ui` package provides a rich set of Solid.js components that directly map to patterns used in the webview. Below is a comparison:

| Webview Pattern | Current Implementation | kilo-ui Replacement |
|----------------|----------------------|-------------------|
| **Buttons** (send, abort, cancel, login, etc.) | Raw `<button>` with inline styles | [`button.tsx`](kilo-ui/src/components/button.tsx) + [`icon-button.tsx`](kilo-ui/src/components/icon-button.tsx) |
| **Cards** (profile, balance, device auth) | Raw `<div>` with inline border/padding styles | [`card.tsx`](kilo-ui/src/components/card.tsx) |
| **Dialog/Modal** (permission overlay) | Custom overlay `<div>` with CSS | [`dialog.tsx`](kilo-ui/src/components/dialog.tsx) |
| **Text input** (prompt textarea) | Raw `<textarea>` with CSS | [`text-field.tsx`](kilo-ui/src/components/text-field.tsx) or prompt-input component |
| **Tabs** (settings sidebar) | Custom signal-based tab nav with inline styles | [`tabs.tsx`](kilo-ui/src/components/tabs.tsx) |
| **List items** (session list) | Custom `<div>` items with CSS classes | [`list.tsx`](kilo-ui/src/components/list.tsx) |
| **Checkbox/Switch** (future settings) | Not yet implemented | [`checkbox.tsx`](kilo-ui/src/components/checkbox.tsx), [`switch.tsx`](kilo-ui/src/components/switch.tsx) |
| **Select** (future settings) | Not yet implemented | [`select.tsx`](kilo-ui/src/components/select.tsx) |
| **Tooltip** | Not implemented | [`tooltip.tsx`](kilo-ui/src/components/tooltip.tsx) |
| **Toast notifications** | Not implemented | [`toast.tsx`](kilo-ui/src/components/toast.tsx) |
| **Spinner/Loading** | Emoji-based (`⏳`, `⚙️`) | [`spinner.tsx`](kilo-ui/src/components/spinner.tsx), [`progress-circle.tsx`](kilo-ui/src/components/progress-circle.tsx) |
| **Code blocks** (tool input/output) | Raw `<pre>` tags | [`code.tsx`](kilo-ui/src/components/code.tsx) |
| **Collapsible/Accordion** (tool details, reasoning) | Custom toggle buttons | [`collapsible.tsx`](kilo-ui/src/components/collapsible.tsx), [`accordion.tsx`](kilo-ui/src/components/accordion.tsx) |
| **Context menu** | Not implemented | [`context-menu.tsx`](kilo-ui/src/components/context-menu.tsx) |
| **Icons** | `lucide-solid` in Settings only; emoji elsewhere | [`icon.tsx`](kilo-ui/src/components/icon.tsx), [`file-icon.tsx`](kilo-ui/src/components/file-icon.tsx) |
| **Markdown rendering** | Not implemented (text shown as plain) | [`markdown.tsx`](kilo-ui/src/components/markdown.tsx) |
| **Diff display** | Not implemented | [`diff.tsx`](kilo-ui/src/components/diff.tsx), [`diff-changes.tsx`](kilo-ui/src/components/diff-changes.tsx) |
| **Message rendering** | Custom `Message.tsx` with part renderers | [`message-part.tsx`](kilo-ui/src/components/message-part.tsx), [`message-row.css`](kilo-ui/src/components/message-row.css) |
| **Theming** | Raw VS Code CSS vars | [`theme/`](kilo-ui/src/theme/) system with `kilo-vscode.json` theme |
| **Global styles** | Single `chat.css` | [`styles/globals.css`](kilo-ui/src/styles/globals.css), [`styles/vscode-bridge.css`](kilo-ui/src/styles/vscode-bridge.css) |

**High-impact adoption targets** (biggest ROI):
1. **Button / IconButton** — would replace ~15+ inline-styled buttons across ProfileView, DeviceAuthCard, Settings, PermissionDialog
2. **Dialog** — would replace the custom permission overlay
3. **Card** — would replace all the hand-styled card containers in ProfileView and DeviceAuthCard
4. **Tabs** — would replace the entire settings sidebar implementation (~80 lines of inline styles)
5. **Accordion/Collapsible** — would replace tool and reasoning expand/collapse in Message.tsx
6. **Markdown** — critical missing feature; assistant text is currently rendered as plain text
7. **Theme system** — kilo-ui already has a `kilo-vscode.json` theme, providing a bridge from VS Code CSS vars to a consistent design token system

---

## Agent 2: kilo-ui Component Library Analysis

### Package Identity

- **Name**: `@kilocode/kilo-ui`
- **Version**: 1.0.14
- **License**: MIT
- **Type**: ESM (`"type": "module"`)

### Architectural Overview

`@kilocode/kilo-ui` is a **thin wrapper / theming layer** around `@opencode-ai/ui`. It mirrors the upstream export structure exactly. Every component `.tsx` file is a 2-line re-export:

```ts
// kilocode_change - new file
export * from "@opencode-ai/ui/button"
```

The package adds value in three ways:

1. **Kilo-specific themes** (`kilo` and `kilo-vscode`) added on top of upstream OC-1 and community themes
2. **CSS override files** for every component — adjusting sizes, border-radius, fonts, and colours to match a VS Code–native look
3. **VS Code bridge CSS** ([`vscode-bridge.css`](kilo-ui/src/styles/vscode-bridge.css)) that maps `--vscode-*` vars → the design token system

### Package Exports Map (from [`package.json`](kilo-ui/package.json))

#### Components (45 exports)

| Export Path | Source File | Category |
|------------|-------------|----------|
| `./font` | [`font.tsx`](kilo-ui/src/components/font.tsx) | Typography |
| `./button` | [`button.tsx`](kilo-ui/src/components/button.tsx) | Form / Action |
| `./icon-button` | [`icon-button.tsx`](kilo-ui/src/components/icon-button.tsx) | Form / Action |
| `./text-field` | [`text-field.tsx`](kilo-ui/src/components/text-field.tsx) | Form / Input |
| `./inline-input` | [`inline-input.tsx`](kilo-ui/src/components/inline-input.tsx) | Form / Input |
| `./select` | [`select.tsx`](kilo-ui/src/components/select.tsx) | Form / Input |
| `./checkbox` | [`checkbox.tsx`](kilo-ui/src/components/checkbox.tsx) | Form / Input |
| `./switch` | [`switch.tsx`](kilo-ui/src/components/switch.tsx) | Form / Input |
| `./radio-group` | [`radio-group.tsx`](kilo-ui/src/components/radio-group.tsx) | Form / Input |
| `./dialog` | [`dialog.tsx`](kilo-ui/src/components/dialog.tsx) | Overlay |
| `./popover` | [`popover.tsx`](kilo-ui/src/components/popover.tsx) | Overlay |
| `./hover-card` | [`hover-card.tsx`](kilo-ui/src/components/hover-card.tsx) | Overlay |
| `./dropdown-menu` | [`dropdown-menu.tsx`](kilo-ui/src/components/dropdown-menu.tsx) | Overlay / Menu |
| `./context-menu` | [`context-menu.tsx`](kilo-ui/src/components/context-menu.tsx) | Overlay / Menu |
| `./tooltip` | [`tooltip.tsx`](kilo-ui/src/components/tooltip.tsx) | Overlay |
| `./toast` | [`toast.tsx`](kilo-ui/src/components/toast.tsx) | Feedback |
| `./spinner` | [`spinner.tsx`](kilo-ui/src/components/spinner.tsx) | Feedback |
| `./progress-circle` | [`progress-circle.tsx`](kilo-ui/src/components/progress-circle.tsx) | Feedback |
| `./card` | [`card.tsx`](kilo-ui/src/components/card.tsx) | Layout |
| `./tabs` | [`tabs.tsx`](kilo-ui/src/components/tabs.tsx) | Layout / Navigation |
| `./list` | [`list.tsx`](kilo-ui/src/components/list.tsx) | Layout |
| `./accordion` | [`accordion.tsx`](kilo-ui/src/components/accordion.tsx) | Layout / Disclosure |
| `./sticky-accordion-header` | [`sticky-accordion-header.tsx`](kilo-ui/src/components/sticky-accordion-header.tsx) | Layout / Disclosure |
| `./collapsible` | [`collapsible.tsx`](kilo-ui/src/components/collapsible.tsx) | Layout / Disclosure |
| `./resize-handle` | [`resize-handle.tsx`](kilo-ui/src/components/resize-handle.tsx) | Layout |
| `./tag` | [`tag.tsx`](kilo-ui/src/components/tag.tsx) | Display |
| `./avatar` | [`avatar.tsx`](kilo-ui/src/components/avatar.tsx) | Display |
| `./icon` | [`icon.tsx`](kilo-ui/src/components/icon.tsx) | Display / Icon |
| `./logo` | [`logo.tsx`](kilo-ui/src/components/logo.tsx) | Display / Brand |
| `./favicon` | [`favicon.tsx`](kilo-ui/src/components/favicon.tsx) | Display / Brand |
| `./file-icon` | [`file-icon.tsx`](kilo-ui/src/components/file-icon.tsx) | Display / Icon |
| `./app-icon` | [`app-icon.tsx`](kilo-ui/src/components/app-icon.tsx) | Display / Icon |
| `./provider-icon` | [`provider-icon.tsx`](kilo-ui/src/components/provider-icon.tsx) | Display / Icon |
| `./code` | [`code.tsx`](kilo-ui/src/components/code.tsx) | Content |
| `./markdown` | [`markdown.tsx`](kilo-ui/src/components/markdown.tsx) | Content |
| `./diff` | [`diff.tsx`](kilo-ui/src/components/diff.tsx) | Content / Diff |
| `./diff-changes` | [`diff-changes.tsx`](kilo-ui/src/components/diff-changes.tsx) | Content / Diff |
| `./diff-ssr` | [`diff-ssr.tsx`](kilo-ui/src/components/diff-ssr.tsx) | Content / Diff |
| `./image-preview` | [`image-preview.tsx`](kilo-ui/src/components/image-preview.tsx) | Content |
| `./typewriter` | [`typewriter.tsx`](kilo-ui/src/components/typewriter.tsx) | Content / Animation |
| `./keybind` | [`keybind.tsx`](kilo-ui/src/components/keybind.tsx) | Display |
| `./message-nav` | [`message-nav.tsx`](kilo-ui/src/components/message-nav.tsx) | Chat |
| `./message-part` | [`message-part.tsx`](kilo-ui/src/components/message-part.tsx) | Chat |
| `./session-review` | [`session-review.tsx`](kilo-ui/src/components/session-review.tsx) | Chat |
| `./session-turn` | [`session-turn.tsx`](kilo-ui/src/components/session-turn.tsx) | Chat |
| `./basic-tool` | [`basic-tool.tsx`](kilo-ui/src/components/basic-tool.tsx) | Chat / Tool |
| `./line-comment` | [`line-comment.tsx`](kilo-ui/src/components/line-comment.tsx) | Chat |

#### Context Providers (8 exports)

| Export Path | Source File |
|------------|-------------|
| `./context` | [`context/index.ts`](kilo-ui/src/context/index.ts) — barrel re-export of `@opencode-ai/ui/context` |
| `./context/code` | [`context/code.tsx`](kilo-ui/src/context/code.tsx) |
| `./context/data` | [`context/data.tsx`](kilo-ui/src/context/data.tsx) |
| `./context/dialog` | [`context/dialog.tsx`](kilo-ui/src/context/dialog.tsx) |
| `./context/diff` | [`context/diff.tsx`](kilo-ui/src/context/diff.tsx) |
| `./context/helper` | [`context/helper.tsx`](kilo-ui/src/context/helper.tsx) |
| `./context/i18n` | [`context/i18n.tsx`](kilo-ui/src/context/i18n.tsx) |
| `./context/marked` | [`context/marked.tsx`](kilo-ui/src/context/marked.tsx) |
| `./context/worker-pool` | [`context/worker-pool.tsx`](kilo-ui/src/context/worker-pool.tsx) |

#### Theme System (5+ exports)

| Export Path | Source File |
|------------|-------------|
| `./theme` | [`theme/index.ts`](kilo-ui/src/theme/index.ts) — barrel (re-exports upstream + Kilo overrides) |
| `./theme/*` | Wildcard glob mapped to [`theme/*.ts`](kilo-ui/src/theme/) |
| `./theme/context` | [`theme/context.tsx`](kilo-ui/src/theme/context.tsx) — **custom implementation** (not a re-export) |

#### Other Exports

| Export Path | Source File |
|------------|-------------|
| `./hooks` | [`hooks/index.ts`](kilo-ui/src/hooks/index.ts) — re-exports `@opencode-ai/ui/hooks` |
| `./pierre` | [`pierre/index.ts`](kilo-ui/src/pierre/index.ts) — re-exports `@opencode-ai/ui/pierre` |
| `./pierre/*` | Wildcard glob for [`pierre/*.ts`](kilo-ui/src/pierre/) |
| `./i18n/*` | Wildcard glob for [`i18n/*.ts`](kilo-ui/src/i18n/) — 16 locale files (ar, br, bs, da, de, en, es, fr, ja, ko, no, pl, ru, th, zh, zht) |
| `./styles` | [`styles/index.css`](kilo-ui/src/styles/index.css) |
| `./styles/tailwind` | [`styles/tailwind/index.css`](kilo-ui/src/styles/tailwind/index.css) |
| `./icons/provider` | [`provider-icons/types.ts`](kilo-ui/src/components/provider-icons/types.ts) |
| `./icons/file-type` | [`file-icons/types.ts`](kilo-ui/src/components/file-icons/types.ts) |
| `./icons/app` | [`app-icons/types.ts`](kilo-ui/src/components/app-icons/types.ts) |
| `./fonts/*` | Static font asset glob |
| `./audio/*` | Static audio asset glob |

### Component Inventory with Descriptions

All 45+ component `.tsx` files are **pure re-exports** from `@opencode-ai/ui`. None contain custom Kilo implementations (yet). Customisation is done purely through CSS overrides. Components are Solid.js functional components using `@kobalte/core` primitives under the hood.

**UI Primitives:**
- [`Button`](kilo-ui/src/components/button.tsx) — Primary, secondary, ghost variants; sizes: small/normal/large. Selectors: `[data-component="button"]`, `[data-variant]`, `[data-size]`
- [`IconButton`](kilo-ui/src/components/icon-button.tsx) — Icon-only button. CSS: `[data-component="icon-button"]`
- [`TextField`](kilo-ui/src/components/text-field.tsx) — Text input. CSS: `[data-component="text-field"]`
- [`InlineInput`](kilo-ui/src/components/inline-input.tsx) — Inline editable text
- [`Select`](kilo-ui/src/components/select.tsx) — Dropdown select. CSS: `[data-component="select"]`
- [`Checkbox`](kilo-ui/src/components/checkbox.tsx) — CSS: `[data-component="checkbox"]`
- [`Switch`](kilo-ui/src/components/switch.tsx) — Toggle switch. CSS: `[data-component="switch"]`
- [`RadioGroup`](kilo-ui/src/components/radio-group.tsx) — Radio button group

**Overlays & Menus:**
- [`Dialog`](kilo-ui/src/components/dialog.tsx) — Modal dialog with overlay, header, title, description slots. CSS: `[data-component="dialog"]`, `[data-slot="dialog-content"]`, `[data-slot="dialog-header"]`, `[data-slot="dialog-title"]`
- [`Popover`](kilo-ui/src/components/popover.tsx) — Floating content panel. CSS: `[data-component="popover"]`
- [`HoverCard`](kilo-ui/src/components/hover-card.tsx) — Content on hover
- [`DropdownMenu`](kilo-ui/src/components/dropdown-menu.tsx) — CSS: `[data-component="dropdown-menu"]`
- [`ContextMenu`](kilo-ui/src/components/context-menu.tsx) — Right-click menu. CSS: `[data-component="context-menu"]`
- [`Tooltip`](kilo-ui/src/components/tooltip.tsx) — CSS: `[data-component="tooltip"]`
- [`Toast`](kilo-ui/src/components/toast.tsx) — Notification toast. CSS: `[data-component="toast"]`

**Layout & Disclosure:**
- [`Card`](kilo-ui/src/components/card.tsx) — CSS: `[data-component="card"]`
- [`Tabs`](kilo-ui/src/components/tabs.tsx) — Tab navigation with pill/default variants. CSS: `[data-component="tabs"]`, `[data-slot="tabs-list"]`, `[data-slot="tabs-trigger"]`
- [`List`](kilo-ui/src/components/list.tsx) — Generic list container. CSS: `[data-component="list"]`
- [`Accordion`](kilo-ui/src/components/accordion.tsx) — Expandable sections. CSS: `[data-component="accordion"]`
- [`StickyAccordionHeader`](kilo-ui/src/components/sticky-accordion-header.tsx)
- [`Collapsible`](kilo-ui/src/components/collapsible.tsx)
- [`ResizeHandle`](kilo-ui/src/components/resize-handle.tsx) — Resizable pane handle

**Display & Feedback:**
- [`Tag`](kilo-ui/src/components/tag.tsx) — Label tag. CSS: `[data-component="tag"]`
- [`Avatar`](kilo-ui/src/components/avatar.tsx) — User avatar with colour palettes
- [`Spinner`](kilo-ui/src/components/spinner.tsx) — Loading spinner
- [`ProgressCircle`](kilo-ui/src/components/progress-circle.tsx) — Circular progress indicator
- [`Icon`](kilo-ui/src/components/icon.tsx) — SVG icon system
- [`Logo`](kilo-ui/src/components/logo.tsx) — Brand logo
- [`Favicon`](kilo-ui/src/components/favicon.tsx) — Dynamic favicon
- [`FileIcon`](kilo-ui/src/components/file-icon.tsx) — File type icons
- [`AppIcon`](kilo-ui/src/components/app-icon.tsx) — Application icons
- [`ProviderIcon`](kilo-ui/src/components/provider-icon.tsx) — AI provider logos
- [`Keybind`](kilo-ui/src/components/keybind.tsx) — Keyboard shortcut display

**Content & Rich Text:**
- [`Code`](kilo-ui/src/components/code.tsx) — Syntax-highlighted code blocks (uses `shiki`). CSS: `[data-component="code"]`
- [`Markdown`](kilo-ui/src/components/markdown.tsx) — Full markdown renderer (uses `marked` + `shiki` + `katex`)
- [`Diff`](kilo-ui/src/components/diff.tsx) — Side-by-side/inline diff viewer (uses `@pierre/diffs`)
- [`DiffChanges`](kilo-ui/src/components/diff-changes.tsx) — Diff change summary
- [`DiffSsr`](kilo-ui/src/components/diff-ssr.tsx) — Server-side renderable diff
- [`ImagePreview`](kilo-ui/src/components/image-preview.tsx) — Image viewer
- [`Typewriter`](kilo-ui/src/components/typewriter.tsx) — Typewriter text animation
- [`Font`](kilo-ui/src/components/font.tsx) — Font loading component

**Chat-specific Components:**
- [`MessageNav`](kilo-ui/src/components/message-nav.tsx) — Message navigation
- [`MessagePart`](kilo-ui/src/components/message-part.tsx) — Message part renderer (text, tool, reasoning, etc.)
- [`SessionReview`](kilo-ui/src/components/session-review.tsx) — Session review/summary
- [`SessionTurn`](kilo-ui/src/components/session-turn.tsx) — Single conversation turn
- [`BasicTool`](kilo-ui/src/components/basic-tool.tsx) — Tool call display
- [`LineComment`](kilo-ui/src/components/line-comment.tsx) — Inline code comment

### Context Providers Available

All context providers are re-exports from `@opencode-ai/ui/context`:

| Context | Description |
|---------|-------------|
| `code` | Code highlighting context (likely wraps Shiki) |
| `data` | Application data / state context |
| `dialog` | Dialog state management (open/close/confirm) |
| `diff` | Diff computation & display context |
| `helper` | [`createSimpleContext()`](kilo-ui/src/context/helper.tsx) — utility for creating typed Solid.js contexts with `use()` + `provider()` pattern |
| `i18n` | Internationalization context |
| `marked` | Markdown parser context (wraps `marked` library) |
| `worker-pool` | Web Worker pool management (for off-thread tasks like syntax highlighting) |

### Theme System Overview

The theme system is the **only area with custom Kilo implementations** (not just re-exports).

**Architecture:**
- Theme types, colour utilities, and resolution logic are re-exported from `@opencode-ai/ui/theme/*`
- [`theme/context.tsx`](kilo-ui/src/theme/context.tsx) is a **custom copy** of the upstream context, with two key changes:
  1. Default theme changed from `"oc-1"` to `"kilo"` ([line 14](kilo-ui/src/theme/context.tsx:14))
  2. Imports [`DEFAULT_THEMES`](kilo-ui/src/theme/default-themes.ts) from local file (includes Kilo themes)

**ThemeProvider API** (from [`createSimpleContext`](kilo-ui/src/context/helper.tsx)):
```ts
const { ThemeProvider, useTheme } = ...
// useTheme() returns:
{
  themeId: () => string,
  colorScheme: () => ColorScheme,      // "light" | "dark" | "system"
  mode: () => "light" | "dark",        // resolved actual mode
  themes: () => Record<string, DesktopTheme>,
  setTheme: (id: string) => void,
  setColorScheme: (scheme: ColorScheme) => void,
  registerTheme: (theme: DesktopTheme) => void,
  previewTheme: (id: string) => void,
  previewColorScheme: (scheme: ColorScheme) => void,
  commitPreview: () => void,
  cancelPreview: () => void,
}
```

**Available Themes** (from [`default-themes.ts`](kilo-ui/src/theme/default-themes.ts)):

| Theme ID | Source | Notes |
|----------|--------|-------|
| `kilo` | [`themes/kilo.json`](kilo-ui/src/theme/themes/kilo.json) | **Default**. VS Code Dark/Light–inspired. Seeds: neutral `#1e1e1e`/`#ffffff`, primary `#0e639c`/`#007acc` |
| `kilo-vscode` | [`themes/kilo-vscode.json`](kilo-ui/src/theme/themes/kilo-vscode.json) | For VS Code extension — provides safe fallbacks; runtime values come from `vscode-bridge.css` |
| `oc-1` | upstream | OpenCode default |
| `tokyonight` | upstream | Community theme |
| `dracula` | upstream | Community theme |
| `monokai` | upstream | Community theme |
| `solarized` | upstream | Community theme |
| `nord` | upstream | Community theme |
| `catppuccin` | upstream | Community theme |
| `ayu` | upstream | Community theme |
| `one-dark-pro` | upstream | Community theme |
| `shades-of-purple` | upstream | Community theme |
| `nightowl` | upstream | Community theme |
| `vesper` | upstream | Community theme |
| `carbonfox` | upstream | Community theme |
| `gruvbox` | upstream | Community theme |
| `aura` | upstream | Community theme |

**Theme JSON Structure** (from [`kilo.json`](kilo-ui/src/theme/themes/kilo.json)):
```json
{
  "$schema": "https://opencode.ai/desktop-theme.json",
  "name": "Kilo",
  "id": "kilo",
  "light": {
    "seeds": { "neutral", "primary", "success", "warning", "error", "info", "interactive", "diffAdd", "diffDelete" },
    "overrides": { /* ~60 design token overrides */ }
  },
  "dark": { /* same structure */ }
}
```

**Persistence**: Theme ID and colour scheme are saved to `localStorage` under keys `opencode-theme-id` and `opencode-color-scheme`.

### Style System Overview

**Two entry points** (identical content, different CSS frameworks):
1. [`./styles`](kilo-ui/src/styles/index.css) → `@import "@opencode-ai/ui/styles"` + overrides
2. [`./styles/tailwind`](kilo-ui/src/styles/tailwind/index.css) → `@import "@opencode-ai/ui/styles/tailwind"` + overrides

**Layer structure** (both entry points follow the same pattern):
```
1. Upstream @opencode-ai/ui base styles
2. globals.css — global design tokens, scrollbar styling, VS Code extension overrides
3. 26× component CSS overrides — per-component visual adjustments
4. vscode-bridge.css — maps --vscode-* vars → design tokens (scoped to [data-theme="kilo-vscode"])
```

**Global Design Tokens** (from [`globals.css`](kilo-ui/src/styles/globals.css)):
```css
:root {
  --font-size-small: 11px;
  --font-size-base: 13px;
  --font-size-large: 16px;
  --radius-xs: 2px;
  --radius-sm: 2px;
  --radius-md: 2px;
  --radius-lg: 4px;
  --radius-xl: 6px;
}
```

**CSS Override Pattern**: Components use `[data-component="..."]` attribute selectors with nested `[data-variant]`, `[data-size]`, and `[data-slot]` selectors. This ensures overrides work regardless of class names:

```css
/* Example: button.css */
[data-component="button"] {
  font-size: 13px;
  border-radius: 2px;
  &[data-variant="primary"] { ... }
  &[data-size="normal"] { height: 26px; padding: 4px 11px; }
}
```

**Components with CSS overrides** (26 files):
`accordion`, `auto-approve-bar`, `button`, `card`, `chat-input`, `checkbox`, `code`, `context-menu`, `dialog`, `dropdown-menu`, `icon-button`, `inline-input`, `list`, `message-row`, `model-info-card`, `model-selector`, `popover`, `prompt-input`, `select`, `settings-sidebar`, `status-indicator`, `switch`, `tabs`, `tag`, `task-header`, `text-field`, `toast`, `tooltip`

**VS Code Bridge** ([`vscode-bridge.css`](kilo-ui/src/styles/vscode-bridge.css)):
- 303 lines of CSS variable mappings
- Scoped to `html[data-theme="kilo-vscode"]`
- Maps **every** design token category: backgrounds, surfaces (including diff), inputs, text, buttons, borders, icons, syntax highlighting, markdown tokens, avatar colours
- Uses VS Code CSS variables like `--vscode-editor-background`, `--vscode-foreground`, `--vscode-button-background`, `--vscode-panel-border`, etc.

### Relationship to @opencode-ai/ui

`@kilocode/kilo-ui` is a **facade/decorator** over `@opencode-ai/ui`:

| Aspect | kilo-ui approach |
|--------|-----------------|
| **Component logic** | 100% re-exported from `@opencode-ai/ui` — no custom component implementations |
| **Component styling** | Overridden via 26 CSS files using `[data-component]` attribute selectors |
| **Theme context** | Custom copy of upstream `ThemeProvider` with different default theme (`"kilo"` instead of `"oc-1"`) |
| **Theme definitions** | Adds 2 Kilo-specific themes (JSON), re-exports all 15 upstream themes |
| **Context providers** | Re-exported from `@opencode-ai/ui/context` |
| **Hooks** | Re-exported from `@opencode-ai/ui/hooks` |
| **Pierre (workers)** | Re-exported from `@opencode-ai/ui/pierre` |
| **i18n** | Re-exported from `@opencode-ai/ui/i18n/*` (16 locales) |
| **Export map** | Mirrors upstream exactly — drop-in replacement by changing import from `@opencode-ai/ui/*` to `@kilocode/kilo-ui/*` |

**Design intent**: Any component import can be swapped from a re-export to a custom implementation without changing consumer code. The package comment in [`index.ts`](kilo-ui/src/index.ts:12) says: _"All component imports are re-exported from @opencode-ai/ui by default, and can be individually overridden by replacing the re-export with a custom implementation."_

### Dependencies and Peer Dependencies

**Peer dependencies** (must be provided by the consuming app):
| Package | Version |
|---------|---------|
| `@opencode-ai/ui` | `workspace:*` |
| `solid-js` | `catalog:` |

**Dev dependencies:**
| Package | Version |
|---------|---------|
| `@tsconfig/node22` | `catalog:` |
| `@types/bun` | `catalog:` |
| `typescript` | `catalog:` |

**Transitive dependencies** (from `@opencode-ai/ui`):
| Package | Usage |
|---------|-------|
| `@kobalte/core` | Accessible UI primitives (headless components) |
| `@kilocode/sdk` | Kilo SDK types |
| `@opencode-ai/util` | Shared utilities |
| `@pierre/diffs` | Diff computation |
| `shiki` + `@shikijs/transformers` | Syntax highlighting |
| `marked` + `marked-shiki` + `marked-katex-extension` | Markdown rendering |
| `katex` | LaTeX math rendering |
| `dompurify` | HTML sanitization |
| `fuzzysort` | Fuzzy search |
| `luxon` | Date/time handling |
| `morphdom` | Efficient DOM diffing |
| `remeda` | Functional utility library |
| `virtua` | Virtual scrolling |
| `solid-list` | Solid.js list utilities |
| `@solid-primitives/bounds`, `media`, `resize-observer` | Solid.js DOM primitives |
| `@solidjs/meta` | Document head management |
| `strip-ansi` | ANSI code stripping |

---

## Agent 3: App → kilo-ui Usage Patterns

### Import Patterns

All source files in `app/src/` import from `@opencode-ai/ui/*` — **never** directly from `@kilocode/kilo-ui`. The aliasing happens at build-time via a custom Vite plugin (see [Vite Aliasing Mechanism](#the-vite-aliasing-mechanism) below).

There are **73 import sites** across ~40 files. Import patterns fall into four categories:

#### 1. Named component imports (most common)

```ts
// Single component per import line
import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"
import { Dialog } from "@opencode-ai/ui/dialog"
import { Tabs } from "@opencode-ai/ui/tabs"
import { Select } from "@opencode-ai/ui/select"
import { Switch } from "@opencode-ai/ui/switch"
import { Spinner } from "@opencode-ai/ui/spinner"
import { TextField } from "@opencode-ai/ui/text-field"
import { Tag } from "@opencode-ai/ui/tag"
import { List } from "@opencode-ai/ui/list"
import { Avatar } from "@opencode-ai/ui/avatar"
import { FileIcon } from "@opencode-ai/ui/file-icon"
import { ProviderIcon } from "@opencode-ai/ui/provider-icon"

// Multiple named exports from one subpath
import { Tooltip, TooltipKeybind } from "@opencode-ai/ui/tooltip"
import { showToast, Toast, toaster } from "@opencode-ai/ui/toast"
import { Logo, Mark } from "@opencode-ai/ui/logo"
import { LineComment as LineCommentView, LineCommentEditor } from "@opencode-ai/ui/line-comment"
import { List, type ListRef } from "@opencode-ai/ui/list"
```

#### 2. Context/provider imports

```ts
import { createSimpleContext } from "@opencode-ai/ui/context"                  // helper
import { I18nProvider } from "@opencode-ai/ui/context"                          // barrel
import { DataProvider } from "@opencode-ai/ui/context"                          // barrel (context/index.ts)
import { DialogProvider } from "@opencode-ai/ui/context/dialog"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { MarkedProvider } from "@opencode-ai/ui/context/marked"
import { DiffComponentProvider } from "@opencode-ai/ui/context/diff"
import { CodeComponentProvider } from "@opencode-ai/ui/context/code"
import { useCodeComponent } from "@opencode-ai/ui/context/code"
```

#### 3. Theme imports

```ts
import { ThemeProvider } from "@opencode-ai/ui/theme"
import { useTheme, type ColorScheme } from "@opencode-ai/ui/theme"
import { resolveThemeVariant, useTheme, withAlpha, type HexColor } from "@opencode-ai/ui/theme"
```

#### 4. Non-component imports (hooks, types, i18n, assets)

```ts
// Hooks
import { useFilteredList } from "@opencode-ai/ui/hooks"
import { createAutoScroll } from "@opencode-ai/ui/hooks"

// Type-only imports
import type { IconName } from "@opencode-ai/ui/icons/provider"
import { iconNames, type IconName } from "@opencode-ai/ui/icons/provider"

// i18n locale dictionaries
import { dict as uiEn } from "@opencode-ai/ui/i18n/en"
import { dict as uiZh } from "@opencode-ai/ui/i18n/zh"
// ... 16 locales total (ar, br, bs, da, de, en, es, fr, ja, ko, no, pl, ru, th, zh, zht)

// Audio assets (default imports for asset URLs)
import alert01 from "@opencode-ai/ui/audio/alert-01.aac"
import bipbop01 from "@opencode-ai/ui/audio/bip-bop-01.aac"
// ... ~40 audio files total

// Font component
import { Font } from "@opencode-ai/ui/font"
```

**Key observation**: Every subpath import (`@opencode-ai/ui/button`, `@opencode-ai/ui/context/dialog`, etc.) maps 1:1 to an entry in the `@kilocode/kilo-ui` package.json exports map. The app never imports from a barrel `@opencode-ai/ui` root — it always uses deep subpath imports.

### Component Usage Examples

#### Button

```tsx
// From settings-general.tsx
<Button size="small" variant="secondary" disabled={store.checking} onClick={check}>
  {language.t("settings.updates.action.checkNow")}
</Button>
```

#### Dialog + Tabs (compound pattern)

```tsx
// From dialog-settings.tsx — Dialog wraps Tabs for a settings modal
<Dialog size="x-large" transition>
  <Tabs orientation="vertical" variant="settings" defaultValue="general" class="h-full">
    <Tabs.List>
      <Tabs.SectionTitle>{language.t("settings.section.desktop")}</Tabs.SectionTitle>
      <Tabs.Trigger value="general">
        <Icon name="sliders" />
        {language.t("settings.tab.general")}
      </Tabs.Trigger>
    </Tabs.List>
    <Tabs.Content value="general">
      <SettingsGeneral />
    </Tabs.Content>
  </Tabs>
</Dialog>
```

#### Select

```tsx
// From settings-general.tsx
<Select
  options={colorSchemeOptions()}
  current={colorSchemeOptions().find((o) => o.value === theme.colorScheme())}
  value={(o) => o.value}
  label={(o) => o.label}
  onSelect={(option) => option && theme.setColorScheme(option.value)}
  onHighlight={(option) => { theme.previewColorScheme(option.value); return () => theme.cancelPreview() }}
  variant="secondary"
  size="small"
  triggerVariant="settings"
/>
```

#### Switch

```tsx
// From settings-general.tsx
<Switch checked={settings.notifications.agent()} onChange={(checked) => settings.notifications.setAgent(checked)} />
```

#### Icon

```tsx
// From various files — always uses string name
<Icon name="sliders" />
<Icon name="keyboard" />
<Icon name="providers" />
<Icon name="models" />
```

#### Toast (imperative API)

```tsx
// From various files — called programmatically, not as JSX
showToast({
  variant: "success",
  icon: "circle-check",
  title: language.t("settings.updates.toast.latest.title"),
  description: language.t("settings.updates.toast.latest.description", { version: "1.0" }),
})

showToast({
  persistent: true,
  icon: "download",
  title: language.t("toast.update.title"),
  description: language.t("toast.update.description", { version: "2.0" }),
  actions: [
    { label: "Install & Restart", onClick: async () => { /* ... */ } },
    { label: "Not Yet", onClick: "dismiss" },
  ],
})
```

#### Tooltip

```tsx
// From various components
<Tooltip content="..."><IconButton ... /></Tooltip>
<TooltipKeybind keybind={{ key: "K", meta: true }}>Open Settings</TooltipKeybind>
```

#### List (with dialog pattern)

```tsx
// From dialog-select-directory.tsx — List used inside Dialog with useDialog hook
const dialog = useDialog()
// ...
<Dialog size="default">
  <List ref={setListRef} items={items} onSelect={(item) => { /* ... */ dialog.close() }}>
    {(item) => (
      <List.Item>
        <FileIcon name={item.name} />
        <span>{item.name}</span>
      </List.Item>
    )}
  </List>
</Dialog>
```

#### DataProvider (bridging app data to UI components)

```tsx
// From directory-layout.tsx — provides shared data to all kilo-ui chat components
<DataProvider
  data={sync.data}
  directory={directory()}
  onPermissionRespond={respond}
  onQuestionReply={replyToQuestion}
  onQuestionReject={rejectQuestion}
  onNavigateToSession={navigateToSession}
>
  <LocalProvider>{props.children}</LocalProvider>
</DataProvider>
```

#### SessionTurn, SessionReview, BasicTool (chat-specific)

```tsx
// From session.tsx — high-level chat rendering components
import { SessionTurn } from "@opencode-ai/ui/session-turn"
import { BasicTool } from "@opencode-ai/ui/basic-tool"
import { SessionReview } from "@opencode-ai/ui/session-review"
```

#### createSimpleContext (for app-local contexts)

```tsx
// From context/platform.tsx, context/layout.tsx, context/sdk.tsx, etc.
// The app uses kilo-ui's createSimpleContext utility to build its own contexts
import { createSimpleContext } from "@opencode-ai/ui/context"

// Example from context/platform.tsx:
export const { use: usePlatform, provider: PlatformProvider } = createSimpleContext({
  name: "Platform",
  init: (props) => { /* ... */ return { /* ... */ } }
})
```

This pattern is used in **14+ app-local context files**: `platform`, `layout`, `sdk`, `global-sdk`, `server`, `sync`, `local`, `settings`, `terminal`, `file`, `comments`, `notification`, `prompt`, `highlights`, `command`, `models`, `permission`, `language`.

### Context/Provider Setup

The app root ([`app/src/app.tsx`](app/src/app.tsx)) sets up a deeply nested provider hierarchy. The providers from `kilo-ui` / `@opencode-ai/ui` form the outer shell:

```
MetaProvider (solidjs/meta)
└── Font                                    ← @opencode-ai/ui/font
    └── ThemeProvider                       ← @opencode-ai/ui/theme (overridden in kilo-ui)
        └── LanguageProvider                ← app-local
            └── UiI18nBridge → I18nProvider ← @opencode-ai/ui/context
                └── ErrorBoundary
                    └── DialogProvider      ← @opencode-ai/ui/context/dialog
                        └── MarkedProvider  ← @opencode-ai/ui/context/marked
                            └── DiffComponentProvider ← @opencode-ai/ui/context/diff
                                └── CodeComponentProvider ← @opencode-ai/ui/context/code
                                    └── [Router + app-local providers]
```

**Key patterns:**

1. **`UiI18nBridge`** — The app has its own language system and bridges it to the UI library's i18n context:
   ```tsx
   function UiI18nBridge(props: ParentProps) {
     const language = useLanguage()
     return <I18nProvider value={{ locale: language.locale, t: language.t }}>{props.children}</I18nProvider>
   }
   ```

2. **`DiffComponentProvider` / `CodeComponentProvider`** — These inject the `Diff` and `Code` components into the context so that `Markdown` and other rendering components can use them without direct imports:
   ```tsx
   <DiffComponentProvider component={Diff}>
     <CodeComponentProvider component={Code}>{props.children}</CodeComponentProvider>
   </DiffComponentProvider>
   ```

3. **`MarkedProvider`** wraps the native markdown parser:
   ```tsx
   <MarkedProvider nativeParser={platform.parseMarkdown}>{props.children}</MarkedProvider>
   ```

4. **`DataProvider`** is set up at the directory-layout level (not the root), providing session data and callbacks:
   ```tsx
   <DataProvider
     data={sync.data}
     directory={directory()}
     onPermissionRespond={respond}
     onQuestionReply={replyToQuestion}
     onQuestionReject={rejectQuestion}
     onNavigateToSession={navigateToSession}
   >
   ```

### Theme and Style Setup

#### CSS Entry Point

The single CSS entry point ([`app/src/index.css`](app/src/index.css:1)) is:

```css
@import "@kilocode/kilo-ui/styles/tailwind"; /* kilocode_change */
```

This imports the full kilo-ui style chain:
1. Upstream `@opencode-ai/ui` Tailwind styles (includes base, reset, utilities)
2. kilo-ui global overrides (font sizes, radii)
3. 26 component CSS overrides (button, dialog, tabs, etc.)
4. `vscode-bridge.css` (maps `--vscode-*` vars → design tokens, scoped to `[data-theme="kilo-vscode"]`)

**Note**: The CSS import uses `@kilocode/kilo-ui` directly (not `@opencode-ai/ui`), bypassing the Vite alias. This is because CSS imports are handled separately and the kilo-ui styles include the overrides.

#### Theme Configuration

The [`ThemeProvider`](kilo-ui/src/theme/context.tsx) (from kilo-ui's custom override) automatically:
- Defaults to the `"kilo"` theme (not the upstream `"oc-1"`)
- Manages light/dark/system colour scheme with `localStorage` persistence
- Injects CSS custom properties into a `<style id="oc-theme">` element
- Listens to `prefers-color-scheme` media query changes

The `useTheme()` hook is used by components like [`settings-general.tsx`](app/src/components/settings-general.tsx) to read/write theme state:
```ts
const theme = useTheme()
theme.themeId()           // current theme id
theme.colorScheme()       // "light" | "dark" | "system"
theme.setTheme("kilo")
theme.setColorScheme("dark")
theme.previewTheme("tokyonight")  // live preview without committing
theme.commitPreview()
theme.cancelPreview()
```

### The Vite Aliasing Mechanism

The file [`app/vite.js`](app/vite.js) contains a custom Vite plugin `kilo-ui-alias` that transparently redirects imports at build time:

```js
const kiloUiDir = resolvePath(fileURLToPath(new URL(".", import.meta.url)), "../kilo-ui")

const kiloUiAlias = {
  name: "kilo-ui-alias",
  enforce: "pre",
  resolveId(source, importer) {
    // Only intercept @opencode-ai/ui imports
    if (!source.startsWith("@opencode-ai/ui")) return

    // Don't redirect imports from within kilo-ui itself (avoids infinite loops)
    const normalizedImporter = importer?.replace(/\\/g, "/")
    if (normalizedImporter?.startsWith(kiloUiDir)) return

    // Don't redirect binary assets (audio, fonts)
    const sub = source.replace("@opencode-ai/ui", "")
    if (sub.startsWith("/audio/") || sub.startsWith("/fonts/")) return

    // Redirect: @opencode-ai/ui/button → @kilocode/kilo-ui/button
    return this.resolve(source.replace("@opencode-ai/ui", "@kilocode/kilo-ui"), importer, {
      skipSelf: true,
    })
  },
}
```

**How it works:**
1. Any import starting with `@opencode-ai/ui` triggers the plugin
2. Imports originating from within the `kilo-ui/` directory are skipped (so kilo-ui's own re-exports from `@opencode-ai/ui` resolve normally)
3. Audio and font asset imports (`/audio/*`, `/fonts/*`) are excluded from redirection
4. Everything else is rewritten: `@opencode-ai/ui/X` → `@kilocode/kilo-ui/X`
5. Since kilo-ui re-exports everything from `@opencode-ai/ui` with added CSS overrides, the app gets themed components transparently

**Plugin registration** (in the exported config array):
```js
export default [
  { name: "kilo-desktop:config", config() { return { resolve: { alias: { "@": ... } } } } },
  kiloUiAlias,     // ← the redirect plugin
  tailwindcss(),
  solidPlugin(),
]
```

### Implications for kilo-vscode

The app's patterns reveal several challenges and considerations for adopting kilo-ui in the VS Code extension webview:

#### 1. No Vite in kilo-vscode — Need esbuild-compatible aliasing

The app uses a **Vite `resolveId` plugin** to redirect `@opencode-ai/ui` → `@kilocode/kilo-ui`. The VS Code extension uses **esbuild**. Options:
- **Direct imports**: Import from `@kilocode/kilo-ui/button` etc. directly in kilo-vscode source (simplest, avoids aliasing entirely)
- **esbuild alias**: Use esbuild's `alias` option: `{ "@opencode-ai/ui": "@kilocode/kilo-ui" }` — but this is a simple string replacement, not a Vite-style resolve hook, and may not handle the "skip kilo-ui internals" logic
- **esbuild plugin**: Write a small esbuild `onResolve` plugin mirroring the Vite logic

**Recommendation**: Direct imports from `@kilocode/kilo-ui/*` are cleanest for kilo-vscode since there's no need to maintain source compatibility with the upstream app.

#### 2. Deep subpath imports only

The app **never** imports from a barrel root (`@opencode-ai/ui`). It always uses subpath imports:
```ts
import { Button } from "@opencode-ai/ui/button"      // ✅ subpath
import { Button } from "@opencode-ai/ui"              // ❌ never used
```
This is good for tree-shaking and aligns with kilo-ui's package.json exports map.

#### 3. Provider nesting is mandatory

The app wraps everything in a specific provider order. For kilo-vscode, the minimum required providers to use kilo-ui components would be:
```
ThemeProvider → I18nProvider → DialogProvider → MarkedProvider → DiffComponentProvider → CodeComponentProvider
```
Some of these (like `MarkedProvider`, `DiffComponentProvider`, `CodeComponentProvider`) may not be needed if kilo-vscode doesn't render markdown/diffs initially.

**Minimal viable provider stack** for basic UI components:
```tsx
<ThemeProvider defaultTheme="kilo-vscode">
  <I18nProvider value={{ locale: "en", t: translateFn }}>
    <DialogProvider>
      {/* app content */}
    </DialogProvider>
  </I18nProvider>
</ThemeProvider>
```

#### 4. `createSimpleContext` pattern is reusable

The app uses `createSimpleContext` from kilo-ui to create 14+ app-local contexts. kilo-vscode can use the same pattern for its own state management (e.g., `VSCodeProvider`, `SessionProvider`).

#### 5. CSS import strategy differs

The app imports `@kilocode/kilo-ui/styles/tailwind` which brings in Tailwind CSS. kilo-vscode currently uses raw CSS. Two options:
- **With Tailwind**: Set up Tailwind in the esbuild pipeline and import `@kilocode/kilo-ui/styles/tailwind`
- **Without Tailwind**: Import `@kilocode/kilo-ui/styles` (non-Tailwind entry) — but kilo-ui components use Tailwind utility classes in their JSX, so some Tailwind processing is likely required

#### 6. Audio/font assets need special handling

The app imports audio assets directly from `@opencode-ai/ui/audio/*` (bypassing the kilo-ui alias). In esbuild, these would need to be configured as external or copied, depending on whether sounds are desired in the extension.

#### 7. The `kilo-vscode` theme already exists

The theme [`kilo-vscode`](kilo-ui/src/theme/themes/kilo-vscode.json) is specifically designed for VS Code extension use. It provides safe CSS fallback values, and the [`vscode-bridge.css`](kilo-ui/src/styles/vscode-bridge.css) file maps `--vscode-*` variables to design tokens when `[data-theme="kilo-vscode"]` is active. The provider would be initialized with:
```tsx
<ThemeProvider defaultTheme="kilo-vscode">
```

#### 8. `DataProvider` bridge pattern

The app passes sync data and callbacks into `DataProvider` so that kilo-ui's chat components (`SessionTurn`, `BasicTool`, `SessionReview`, etc.) can access session/message data. For kilo-vscode, this same bridge would connect the VS Code extension's message-passing state to the UI components:
```tsx
<DataProvider
  data={sessionData}
  directory={workspaceDir}
  onPermissionRespond={sendToExtension("permission.respond")}
  onNavigateToSession={sendToExtension("session.navigate")}
>
```

---

## Agent 4: Build Configuration & Webview Integration Analysis

### Current esbuild Webview Build Configuration

The build is defined in [`esbuild.js`](kilo-vscode/esbuild.js:1). There are **two separate esbuild contexts** built in parallel:

#### Extension build (Node.js)
```js
{
  entryPoints: ["src/extension.ts"],
  bundle: true,
  format: "cjs",
  platform: "node",
  outfile: "dist/extension.js",
  external: ["vscode"],
  minify: production,
  sourcemap: !production,
  plugins: [esbuildProblemMatcherPlugin],
}
```

#### Webview build (Browser)
```js
{
  entryPoints: ["webview-ui/src/index.tsx"],
  bundle: true,
  format: "iife",                        // ← Immediately Invoked Function Expression
  platform: "browser",
  outfile: "dist/webview.js",
  minify: production,
  sourcemap: !production,
  plugins: [solidPlugin(), esbuildProblemMatcherPlugin],
}
```

**Key observations:**
- **Format is `iife`** (not `esm`), appropriate for injection via `<script>` tag in a webview
- **Single output file**: `dist/webview.js` — no code splitting
- **[`solidPlugin()`](kilo-vscode/esbuild.js:56)** handles the JSX → Solid.js compilation (`jsx: "preserve"` in tsconfig, then the plugin transforms it)
- **No CSS loader plugin** is explicitly configured — esbuild's built-in CSS handling is relied upon
- **No alias or resolve configuration** — all imports must resolve via standard Node resolution
- **Watch mode** is supported (`--watch` flag triggers [`context.watch()`](kilo-vscode/esbuild.js:60) for both builds)
- **No `external` declarations** for the webview build — everything is bundled inline

**CSS output**: When esbuild encounters a CSS `import` (e.g., `import "./styles/chat.css"`), it automatically produces a sibling `.css` file with the same name as the JS output. Currently, `dist/webview.js` produces `dist/webview.css` as a side effect of the `import "./styles/chat.css"` in [`App.tsx`](kilo-vscode/webview-ui/src/App.tsx:9).

### Current Webview HTML Generation (from KiloProvider)

The HTML is generated by [`_getHtmlForWebview()`](kilo-vscode/src/KiloProvider.ts:688) in [`KiloProvider.ts`](kilo-vscode/src/KiloProvider.ts). It produces a minimal HTML5 document:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="...">
  <title>Kilo Code</title>
  <link rel="stylesheet" href="${styleUri}">       <!-- dist/webview.css -->
  <style>
    /* Inline base styles: html/body reset, #root height, .container flexbox */
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>  <!-- dist/webview.js -->
</body>
</html>
```

**Two resource URIs** are resolved at runtime ([lines 689-690](kilo-vscode/src/KiloProvider.ts:689)):
- `scriptUri`: `webview.asWebviewUri(Uri.joinPath(extensionUri, "dist", "webview.js"))`
- `styleUri`: `webview.asWebviewUri(Uri.joinPath(extensionUri, "dist", "webview.css"))`

**Webview options** ([lines 95-98](kilo-vscode/src/KiloProvider.ts:95)):
```ts
webviewView.webview.options = {
  enableScripts: true,
  localResourceRoots: [this.extensionUri],  // Only the extension root
}
```

**Inline styles** in the HTML template set:
- `html, body`: `margin: 0; padding: 0; height: 100%; overflow: hidden`
- `body`: `color: var(--vscode-foreground); font-family: var(--vscode-font-family)`
- `#root`: `height: 100%`
- `.container`: `height: 100%; display: flex; flex-direction: column; height: 100vh`

The method is used in two places:
1. [`resolveWebviewView()`](kilo-vscode/src/KiloProvider.ts:85) — sidebar webview
2. [`resolveWebviewPanel()`](kilo-vscode/src/KiloProvider.ts:113) — editor tab webview

Both share the exact same HTML template and options.

### Current CSS Loading Mechanism

CSS loading follows a simple two-layer approach:

1. **External CSS file** — `dist/webview.css` loaded via `<link rel="stylesheet">` in the HTML template. This file is automatically produced by esbuild when it encounters the CSS import in [`App.tsx`](kilo-vscode/webview-ui/src/App.tsx:9):
   ```tsx
   import "./styles/chat.css"
   ```
   The single [`chat.css`](kilo-vscode/webview-ui/src/styles/chat.css) file (552 lines) contains all component-level styles.

2. **Inline `<style>` block** — Base reset styles (body/html margin, font, root height) are embedded directly in the HTML template.

3. **Inline `style={{ }}` objects** — Many components (ProfileView, DeviceAuthCard, Settings, DummyView) use Solid.js inline style objects referencing `var(--vscode-*)` variables.

**No Tailwind, no CSS modules, no PostCSS** are involved in the current pipeline. Just raw CSS → esbuild bundling.

### Current CSP (Content Security Policy)

The CSP is defined in [`_getHtmlForWebview()`](kilo-vscode/src/KiloProvider.ts:700):

```
default-src 'none';
style-src 'unsafe-inline' ${webview.cspSource};
script-src 'nonce-${nonce}';
connect-src http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*;
img-src ${webview.cspSource} data: https:
```

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src` | `'none'` | Block everything by default |
| `style-src` | `'unsafe-inline' ${webview.cspSource}` | Allow inline styles AND extension-local CSS files |
| `script-src` | `'nonce-${nonce}'` | Only allow scripts with the generated nonce |
| `connect-src` | `http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*` | HTTP + WebSocket to localhost (for CLI backend) |
| `img-src` | `${webview.cspSource} data: https:` | Extension-local images, data URIs, and HTTPS images |

**`webview.cspSource`** expands to something like `vscode-webview:` or the specific webview origin, allowing resources from the extension's `dist/` directory.

**Notable:** `font-src` is **not** listed in the CSP. This means loading external/local fonts (e.g., from `@kilocode/kilo-ui/fonts/*`) would be **blocked by default** under `default-src 'none'`. A `font-src` directive would need to be added.

### TypeScript Configuration for Webview

There are **two separate tsconfigs**:

#### Extension tsconfig ([`tsconfig.json`](kilo-vscode/tsconfig.json))
```json
{
  "compilerOptions": {
    "module": "Node16",
    "target": "ES2022",
    "lib": ["ES2022"],
    "rootDir": "src",
    "strict": true,
    "types": ["node", "vscode", "mocha"]
  },
  "include": ["src/**/*"],
  "exclude": ["webview-ui"]
}
```

#### Webview tsconfig ([`webview-ui/tsconfig.json`](kilo-vscode/webview-ui/tsconfig.json))
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "jsxImportSource": "solid-js",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

**Key points for kilo-ui integration:**
- [`moduleResolution: "bundler"`](kilo-vscode/webview-ui/tsconfig.json:5) supports package.json `"exports"` maps — this is **required** for resolving `@kilocode/kilo-ui/button` etc. via subpath exports
- `jsxImportSource: "solid-js"` is already set — compatible with kilo-ui components
- `"DOM"` and `"DOM.Iterable"` libs are included — needed for browser APIs used by kilo-ui components
- No `paths` aliases are configured — would need to be added if using `@opencode-ai/ui` imports with redirect, or not needed if importing directly from `@kilocode/kilo-ui`

### Dependency Chain: kilo-ui → @opencode-ai/ui → @kobalte/core → solid-js

The full dependency tree for using `@kilocode/kilo-ui` in kilo-vscode:

```
@kilocode/kilo-ui (workspace:*)
  ├── [peer] @opencode-ai/ui (workspace:*)
  │   ├── @kobalte/core (catalog:)         ← accessible headless component primitives
  │   ├── @kilocode/sdk (workspace:*)
  │   ├── @opencode-ai/util (workspace:*)
  │   ├── @pierre/diffs (catalog:)
  │   ├── shiki + @shikijs/transformers    ← syntax highlighting
  │   ├── marked + marked-shiki + marked-katex-extension  ← markdown
  │   ├── katex                            ← LaTeX math
  │   ├── dompurify                        ← HTML sanitization
  │   ├── morphdom                         ← DOM diffing
  │   ├── luxon                            ← dates
  │   ├── fuzzysort                        ← fuzzy search
  │   ├── remeda                           ← functional utilities
  │   ├── virtua                           ← virtual scrolling
  │   ├── solid-list (catalog:)
  │   ├── @solid-primitives/bounds, media, resize-observer
  │   ├── @solidjs/meta
  │   └── strip-ansi
  └── [peer] solid-js (catalog:) ← already in kilo-vscode
```

**Current kilo-vscode dependencies** (from [`package.json`](kilo-vscode/package.json:149)):
```json
{
  "dependencies": {
    "eventsource": "^2.0.2",
    "lucide-solid": "^0.563.0",
    "solid-js": "^1.9.11"
  }
}
```

**New dependencies required** (to add `@kilocode/kilo-ui`):
- `@kilocode/kilo-ui`: `workspace:*`
- `@opencode-ai/ui`: `workspace:*` (peer dependency of kilo-ui)
- `@kobalte/core`: `catalog:` (dependency of @opencode-ai/ui)
- All transitive deps of `@opencode-ai/ui` (shiki, marked, katex, dompurify, etc.)
- `@kilocode/sdk`: `workspace:*`
- `@opencode-ai/util`: `workspace:*`
- `tailwindcss`: `catalog:` (if Tailwind path is chosen)

**`lucide-solid`** can eventually be removed once the kilo-ui `Icon` component (which uses a custom SVG sprite system) replaces all lucide icon usage.

### Challenges for esbuild Integration

#### 1. Subpath exports resolution

kilo-ui uses package.json `"exports"` for subpath resolution:
```json
{ "./button": "./src/components/button.tsx" }
```

**Challenge**: esbuild supports `"exports"` maps natively, **but** the exports point to `.tsx` source files (not compiled `.js`). This means esbuild must:
- Resolve `@kilocode/kilo-ui/button` → `kilo-ui/src/components/button.tsx`
- Then resolve `@opencode-ai/ui/button` → `ui/src/components/button.tsx` (the re-export)
- Apply [`solidPlugin()`](kilo-vscode/esbuild.js:56) to compile the Solid.js JSX in those files

This should work with the existing `solidPlugin()` **if** esbuild's resolution correctly follows the workspace package links. Testing needed.

**Potential issue**: Wildcard exports (`"./i18n/*": "./src/i18n/*.ts"`) may not be supported by all esbuild versions. Verify esbuild ^0.27.2 handles these.

#### 2. CSS bundling — plain CSS (non-Tailwind path)

kilo-ui's `./styles` entry point ([`styles/index.css`](kilo-ui/src/styles/index.css)) uses CSS `@import` extensively:
```css
@import "@opencode-ai/ui/styles";
@import "./globals.css";
@import "../components/accordion.css";
/* ... 26 more component CSS files ... */
@import "./vscode-bridge.css";
```

esbuild handles `@import` in CSS natively — it will inline all imported CSS files. **However**, the import `@import "@opencode-ai/ui/styles"` references a package subpath export. esbuild's CSS `@import` resolver needs to follow package.json exports for this to work. This may require:
- An esbuild plugin to resolve package CSS imports, OR
- A pre-built CSS file that's already fully resolved

#### 3. CSS bundling — Tailwind path

The `./styles/tailwind` entry point ([`styles/tailwind/index.css`](kilo-ui/src/styles/tailwind/index.css)) includes:
```css
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities) source("../../../../");
```

**esbuild cannot process Tailwind CSS natively.** Tailwind v4 uses `@tailwindcss/vite` or `@tailwindcss/postcss` plugins. For esbuild, options are:

1. **Pre-build Tailwind CSS**: Run `tailwindcss` CLI or a separate build step to produce a fully-compiled CSS file, then import that file in the esbuild webview build
2. **Use the non-Tailwind path**: Import `@kilocode/kilo-ui/styles` instead of `@kilocode/kilo-ui/styles/tailwind` — this avoids Tailwind entirely, but then any Tailwind utility classes used in component source or app source won't work
3. **PostCSS plugin for esbuild**: Use an esbuild PostCSS plugin that includes the Tailwind v4 PostCSS plugin
4. **Switch to Vite for webview build**: Replace esbuild with Vite for the webview (like the desktop app uses) — largest change but most compatible

**Analysis of Tailwind usage**: Only 2 out of ~45 component files in `@opencode-ai/ui/src/components/` use Tailwind utility classes directly ([`code.tsx`](ui/src/components/code.tsx) and [`session-turn.tsx`](ui/src/components/session-turn.tsx)). The component CSS files themselves use `[data-component]` selectors, not Tailwind classes. However, the desktop app (`app/src/`) uses Tailwind classes in 38 files. If kilo-vscode's webview code also wants to use Tailwind utility classes, the Tailwind build step is required.

#### 4. CSS `@layer` support

The upstream styles use CSS `@layer`:
```css
@layer theme, base, components, utilities;
```

esbuild **does** support CSS `@layer` — this should not be an issue.

#### 5. `font-src` in CSP

kilo-ui's `Font` component loads web fonts. The current CSP lacks a `font-src` directive. Would need:
```
font-src ${webview.cspSource}
```

#### 6. Dynamic `<style>` injection by ThemeProvider

The kilo-ui `ThemeProvider` injects CSS custom properties into a `<style id="oc-theme">` element at runtime. This works within the current CSP because `style-src 'unsafe-inline'` is already allowed.

#### 7. DOMPurify and `innerHTML` usage

kilo-ui's markdown component uses `dompurify` + `innerHTML` for rendered HTML. The CSP currently blocks inline scripts (`script-src` requires nonce), but `innerHTML` for DOM content (not scripts) should work. However, if any component uses `eval()` or `new Function()`, it would be blocked.

#### 8. Web Workers

kilo-ui has a [`context/worker-pool`](kilo-ui/src/context/worker-pool.tsx) for off-thread tasks. Web Workers in VS Code webviews require special handling — the worker script would need to be bundled separately and loaded via `webview.asWebviewUri()`. This is a significant complexity if syntax highlighting (shiki) needs to run in a worker.

### Recommended Build Changes

#### Approach A: Minimal (non-Tailwind) — Recommended for initial integration

1. **Add dependencies** to [`package.json`](kilo-vscode/package.json):
   ```json
   {
     "dependencies": {
       "@kilocode/kilo-ui": "workspace:*",
       "@opencode-ai/ui": "workspace:*",
       "@kobalte/core": "catalog:",
       "@kilocode/sdk": "workspace:*",
       "@opencode-ai/util": "workspace:*",
       "solid-js": "^1.9.11"
     }
   }
   ```

2. **Import CSS in webview entry** ([`index.tsx`](kilo-vscode/webview-ui/src/index.tsx)):
   ```tsx
   import "@kilocode/kilo-ui/styles"  // non-Tailwind variant
   ```

3. **Add CSS import resolution** — add an esbuild plugin to [`esbuild.js`](kilo-vscode/esbuild.js) that resolves `@import "pkg/subpath"` in CSS files via package.json exports:
   ```js
   const cssPackageResolvePlugin = {
     name: "css-package-resolve",
     setup(build) {
       build.onResolve({ filter: /^@/ }, (args) => {
         if (args.kind === "import-rule") {
           // Resolve package CSS imports through exports map
           // Implementation TBD
         }
       })
     }
   }
   ```

4. **Update CSP** in [`KiloProvider.ts`](kilo-vscode/src/KiloProvider.ts:700) — add `font-src`:
   ```ts
   const csp = [
     "default-src 'none'",
     `style-src 'unsafe-inline' ${webview.cspSource}`,
     `script-src 'nonce-${nonce}'`,
     `font-src ${webview.cspSource}`,  // ← NEW
     "connect-src http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*",
     `img-src ${webview.cspSource} data: https:`,
   ].join("; ")
   ```

5. **Set `data-theme="kilo-vscode"`** on the `<html>` element in the HTML template to activate the vscode-bridge CSS:
   ```html
   <html lang="en" data-theme="kilo-vscode">
   ```

6. **Keep single CSS output** — esbuild will produce `dist/webview.css` with all kilo-ui styles bundled in. The HTML template's `<link rel="stylesheet" href="${styleUri}">` continues to work unchanged.

#### Approach B: With Tailwind (full feature parity with desktop app)

All of Approach A, plus:

1. **Add Tailwind** to devDependencies: `"tailwindcss": "catalog:"`
2. **Pre-build CSS** — add a build step that runs the Tailwind CLI on the kilo-ui/styles/tailwind entry:
   ```bash
   npx @tailwindcss/cli -i ./webview-ui/src/styles/main.css -o ./dist/webview-tailwind.css
   ```
   Where `main.css` is:
   ```css
   @import "@kilocode/kilo-ui/styles/tailwind";
   ```
3. **Wire up in [`esbuild.js`](kilo-vscode/esbuild.js)** — either:
   - Import the pre-built CSS in the entry point, OR
   - Use `esbuild-postcss` plugin with Tailwind v4 PostCSS, OR
   - Run Tailwind as a separate parallel process in watch mode

**Recommendation**: Start with **Approach A** (non-Tailwind). The kilo-ui component library's styles work without Tailwind (they use `[data-component]` CSS selectors). Only 2 of ~45 upstream UI component files use Tailwind utility classes inline. Tailwind can be added later when kilo-vscode's own app-level code needs utility classes.

#### Approach C: Switch webview build to Vite (maximum compatibility)

Replace the webview esbuild context with Vite, reusing the existing [`app/vite.js`](app/vite.js) config pattern:

- Provides native Tailwind v4 support via `@tailwindcss/vite`
- Enables the `kilo-ui-alias` Vite plugin from the desktop app
- Supports CSS `@import` resolution with package exports natively
- HMR support for faster dev iteration

**Trade-off**: Larger change, introduces a second build system (esbuild for extension + Vite for webview), but aligns the webview build with the desktop app that already successfully uses kilo-ui.

### Summary of Required Changes by Area

| Area | Change | Priority |
|------|--------|----------|
| [`package.json`](kilo-vscode/package.json) | Add `@kilocode/kilo-ui`, `@opencode-ai/ui`, and transitive deps | Required |
| [`esbuild.js`](kilo-vscode/esbuild.js) | Add CSS package resolution plugin for `@import` | Required |
| [`KiloProvider.ts`](kilo-vscode/src/KiloProvider.ts:700) | Add `font-src` to CSP; add `data-theme="kilo-vscode"` to `<html>` | Required |
| [`webview-ui/src/index.tsx`](kilo-vscode/webview-ui/src/index.tsx) | Import `@kilocode/kilo-ui/styles` | Required |
| [`webview-ui/tsconfig.json`](kilo-vscode/webview-ui/tsconfig.json) | No changes needed (already has `bundler` resolution) | None |
| [`esbuild.js`](kilo-vscode/esbuild.js) or new build step | Tailwind CSS compilation (if Approach B) | Optional |
| CSS output | Single file remains, just larger with kilo-ui styles included | No change needed |
| HTML template | Single `<link>` tag remains sufficient | No change needed |
