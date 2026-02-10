# Mode Switcher

**GitHub Issue:** [#162](https://github.com/Kilo-Org/kilo/issues/162)
**Priority:** P2
**Status:** ❌ Not started

## Description

Users should be able to switch between modes (e.g., Code, Architect, Ask, Debug, etc.).

## Requirements

- Display available modes
- Allow switching between modes during a session
- Show the currently active mode
- Mode affects how the AI agent behaves (different system prompts, tool access, file restrictions)
- Accessible from the chat UI (e.g., dropdown or button group)

## Current State

No mode switcher UI exists. The CLI backend supports modes (visible in the old extension).

## Gaps

- No mode list UI component
- No mode selection mechanism in the webview
- Need to determine CLI endpoints for listing modes and switching active mode
- Need to communicate mode restrictions (e.g., file patterns, available tools) to the UI
