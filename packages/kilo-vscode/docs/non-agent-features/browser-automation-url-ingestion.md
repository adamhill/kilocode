# Browser Automation & URL Ingestion

**Priority:** P3
**Status:** 🔨 Partial

## What Exists

- `BrowserAutomationService` is complete: state machine (disabled → registering → connected/failed/disconnected), Playwright MCP registration, settings toggles (enable, system Chrome, headless), reconnect on CLI backend restart

## Remaining Work

- URL-to-markdown ingestion (paste a URL and have it fetched/summarized into context)
