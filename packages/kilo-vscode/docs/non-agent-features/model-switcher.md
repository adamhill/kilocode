# Model Switcher

**GitHub Issue:** [#163](https://github.com/Kilo-Org/kilo/issues/163)
**Priority:** P1
**Status:** 🔨 Partial (In progress)

## Description

Users should be able to view and switch between the models for the providers that they have connected.

## Requirements

- Display available models for connected providers
- Allow switching between models during a session
- Show the currently selected model
- Model list should update when providers are added/removed
- Accessible from the chat UI (e.g., dropdown in prompt area or task header)

## Current State

No model switcher UI exists. The CLI backend likely has endpoints for listing available models and setting the active model.

## Gaps

- No model list UI component
- No model selection/switching mechanism in the webview
- Need to determine CLI endpoints for model listing and switching
- Need to handle model capabilities (e.g., thinking support, vision) in the UI
