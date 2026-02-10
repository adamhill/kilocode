# Provider Configuration & Switching

**GitHub Issue:** [#175](https://github.com/Kilo-Org/kilo/issues/175)
**Priority:** P1
**Status:** ❌ Not started

## Description

Configure a provider and switch between configured providers. Providers are the AI model backends (e.g., Anthropic, OpenAI, Kilo Gateway, etc.).

## Requirements

- List configured providers
- Add/edit/remove provider configurations (API keys, endpoints, etc.)
- Switch between providers
- Show provider status (connected, error, etc.)
- Provider configuration persists across sessions
- Accessible from settings UI and/or quick-switch in chat

## Current State

No provider configuration UI exists. The [`ProvidersTab.tsx`](../../webview-ui/src/components/settings/ProvidersTab.tsx) settings tab is a stub. The CLI manages provider configuration.

## Gaps

- No provider list/management UI
- No provider configuration form (API key input, endpoint config)
- No provider switching mechanism
- Need to determine CLI endpoints for provider CRUD and switching
- Related to [Model Switcher](model-switcher.md) which depends on provider being selected
- Related to [Kilo Gateway](kilo-gateway.md) as a specific provider
