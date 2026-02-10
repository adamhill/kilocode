# Kilo Themed Chat Session

**GitHub Issue:** [#161](https://github.com/Kilo-Org/kilo/issues/161)
**Priority:** P0
**Status:** 🔨 Partial

## Description

The chat session should be present and Kilo-themed. This is the core chat experience that ties together all chat UI features into a cohesive, branded interface.

## Requirements

- Chat session UI is visually consistent with Kilo branding
- Tool calls are rendered inline with status indicators (⏳⚙️✓✕)
- Thinking/reasoning blocks are collapsible
- AI responses support streaming text deltas
- User input is supported via prompt input area
- Overall theming aligns with VS Code theme tokens + Kilo brand colours

## Current State

The basic chat infrastructure exists:

- [`ChatView.tsx`](../../webview-ui/src/components/chat/ChatView.tsx) — main chat layout with message list and prompt input
- [`MessageList.tsx`](../../webview-ui/src/components/chat/MessageList.tsx) — renders messages with auto-scroll
- [`Message.tsx`](../../webview-ui/src/components/chat/Message.tsx) — renders text, tool, and reasoning parts with status icons
- [`PromptInput.tsx`](../../webview-ui/src/components/chat/PromptInput.tsx) — send/abort controls

## Gaps

- No dedicated Kilo theming/branding (custom colours, logo, etc.)
- Messages render as plain text — no markdown rendering or syntax highlighting
- Missing visual polish (spacing, typography, animations)
- No loading/empty states with branded design
