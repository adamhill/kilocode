# Settings UI

**GitHub Issue:** [#170](https://github.com/Kilo-Org/kilo/issues/170)
**Priority:** P1
**Status:** 🔨 Partial

## Description

Replicate the settings that are available in OpenCode (CLI) and allow users to customize them through the VS Code extension UI.

## Requirements

- Settings UI that mirrors OpenCode's configuration options
- Organized into logical tabs/sections
- Settings persist and sync with CLI configuration
- Changes take effect immediately or with clear save/apply semantics
- Include all major setting categories: providers, models, behaviour, display, etc.

## Current State

A 14-tab settings sidebar navigation shell exists in [`Settings.tsx`](../../webview-ui/src/components/Settings.tsx) with stub tab components:

- [`ProvidersTab.tsx`](../../webview-ui/src/components/settings/ProvidersTab.tsx)
- [`AgentBehaviourTab.tsx`](../../webview-ui/src/components/settings/AgentBehaviourTab.tsx)
- [`AutoApproveTab.tsx`](../../webview-ui/src/components/settings/AutoApproveTab.tsx)
- [`AutocompleteTab.tsx`](../../webview-ui/src/components/settings/AutocompleteTab.tsx)
- [`BrowserTab.tsx`](../../webview-ui/src/components/settings/BrowserTab.tsx)
- [`CheckpointsTab.tsx`](../../webview-ui/src/components/settings/CheckpointsTab.tsx)
- [`ContextTab.tsx`](../../webview-ui/src/components/settings/ContextTab.tsx)
- [`DisplayTab.tsx`](../../webview-ui/src/components/settings/DisplayTab.tsx)
- [`ExperimentalTab.tsx`](../../webview-ui/src/components/settings/ExperimentalTab.tsx)
- [`LanguageTab.tsx`](../../webview-ui/src/components/settings/LanguageTab.tsx)
- [`NotificationsTab.tsx`](../../webview-ui/src/components/settings/NotificationsTab.tsx)
- [`PromptsTab.tsx`](../../webview-ui/src/components/settings/PromptsTab.tsx)
- [`TerminalTab.tsx`](../../webview-ui/src/components/settings/TerminalTab.tsx)
- [`AboutKiloCodeTab.tsx`](../../webview-ui/src/components/settings/AboutKiloCodeTab.tsx)

## Gaps

- All tabs are stubs — no actual form controls or settings values
- No settings read/write integration with CLI backend
- No settings validation
- Need to determine which CLI endpoints expose/accept configuration
- No import/export settings functionality
