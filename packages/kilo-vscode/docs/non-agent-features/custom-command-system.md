# Custom Command System

**Priority:** P2
**Status:** ❌ Not started

## What Exists

- `CommandConfig` type in `types.ts` with `command` and `description` fields

## Remaining Work

- Slash command input handling in chat (detect `/` prefix, show command list)
- Project-level command discovery (scan `.kilocode/commands/` or similar)
- YAML frontmatter metadata support
- Symlink-aware command discovery
- VS Code command palette entry points
- Wire to CLI's custom command system for execution
