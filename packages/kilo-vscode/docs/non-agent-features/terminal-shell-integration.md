# Terminal / Shell Integration

**Priority:** P1
**Status:** 🔨 Partial

## What Exists

- Agent Manager's `SetupScriptRunner` uses `terminal.shellIntegration` for setup scripts with exit code tracking (with fallback to `sendText`)
- Terminal context menu actions registered (Add Content, Fix Command, Explain Command) but content capture is a stub

## Remaining Work

- `getTerminalSelection()` implementation — currently returns empty string, needs VS Code shell integration API
- General terminal integration for AI command execution display
- Exit code tracking for command execution
- Working directory change detection
