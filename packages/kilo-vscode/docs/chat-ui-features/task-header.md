# Task Header

**GitHub Issue:** [#166](https://github.com/Kilo-Org/kilo/issues/166)
**Priority:** P0
**Status:** ❌ Not started

## Description

A task header displayed at the top of the chat session that provides key context about the current task.

## Requirements

- Display the initial prompt/task description
- Show cost so far (token usage / monetary cost)
- Show context size (tokens in context window)
- Include a button to manually trigger context compaction
- Update in real-time as the task progresses

## Current State

No task header exists. The chat view starts directly with the message list.

## Gaps

- No task header component
- No cost tracking displayed in the UI (cost data may be available from CLI)
- No context size indicator
- No context compaction trigger (CLI may support this via an endpoint)
- Need to determine what SSE events or HTTP endpoints provide cost/context data
