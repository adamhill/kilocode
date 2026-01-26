# Kilocode Modes Migration

This document explains how Kilocode custom modes are automatically migrated to Opencode agents.

## Overview

Kilocode stores custom modes in YAML files. When Opencode starts, it reads these files and converts them to Opencode's agent format, injecting them via the `OPENCODE_CONFIG_CONTENT` mechanism.

## Source Locations

The migrator reads custom modes from these locations (in order, later entries override earlier ones):

### Global Modes (VSCode Extension Storage)

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/Code/User/globalStorage/kilocode.kilo-code/settings/custom_modes.yaml` |
| Windows | `%APPDATA%/Code/User/globalStorage/kilocode.kilo-code/settings/custom_modes.yaml` |
| Linux | `~/.config/Code/User/globalStorage/kilocode.kilo-code/settings/custom_modes.yaml` |

### Project Modes

| Location | Description |
|----------|-------------|
| `.kilocodemodes` | Project-specific modes in the workspace root |

## Field Mapping

### Migrated Fields

| Kilocode Field | Opencode Field | Notes |
|----------------|----------------|-------|
| `slug` | Agent key | Used as the agent identifier |
| `roleDefinition` | `prompt` | Combined with `customInstructions` |
| `customInstructions` | `prompt` | Appended after `roleDefinition` with `\n\n` separator |
| `groups` | `permission` | See permission mapping below |
| `description` | `description` | Primary source for description |
| `whenToUse` | `description` | Fallback if no `description` |
| `name` | `description` | Final fallback |

### Permission Mapping

Kilocode uses "groups" to define what tools a mode can access. These are converted to Opencode's permission system:

| Kilocode Group | Opencode Permission | Notes |
|----------------|---------------------|-------|
| `read` | `read: "allow"` | File reading |
| `edit` | `edit: "allow"` | File editing |
| `command` | `bash: "allow"` | Shell commands |
| `browser` | `bash: "allow"` | Browser actions (via bash) |
| `mcp` | `mcp: "allow"` | MCP server access |

**Important:** Permissions that are NOT in the groups list are explicitly set to `"deny"`. This ensures that a mode with only `read` and `edit` groups cannot run shell commands or access MCP servers.

### File Restrictions

Kilocode supports restricting edit access to specific file patterns:

```yaml
groups:
  - read
  - - edit
    - fileRegex: "\\.md$"
      description: "Markdown files only"
```

This converts to:

```json
{
  "permission": {
    "read": "allow",
    "edit": {
      "\\.md$": "allow",
      "*": "deny"
    },
    "bash": "deny",
    "mcp": "deny"
  }
}
```

Note: `bash` and `mcp` are explicitly denied because they weren't in the original groups list.

## Default Modes

The following Kilocode default modes are **skipped** during migration because Opencode has native equivalents:

| Kilocode Mode | Reason |
|---------------|--------|
| `code` | Maps to Opencode's `build` agent |
| `architect` | Maps to Opencode's `plan` agent |
| `ask` | Read-only exploration (use `explore` subagent) |
| `debug` | Debugging workflow (use `build` with debug instructions) |
| `orchestrator` | Redundant - all Opencode agents can spawn subagents |

## Example Conversion

### Kilocode Mode (YAML)

```yaml
customModes:
  - slug: translate
    name: Translate
    roleDefinition: You are a linguistic specialist focused on translation.
    customInstructions: |
      When translating:
      - Maintain consistent terminology
      - Preserve formatting
    groups:
      - read
      - - edit
        - fileRegex: "src/i18n/.*\\.json$"
          description: "Translation files only"
    description: Translate content between languages
```

### Opencode Agent (JSON)

```json
{
  "agent": {
    "translate": {
      "mode": "primary",
      "description": "Translate content between languages",
      "prompt": "You are a linguistic specialist focused on translation.\n\nWhen translating:\n- Maintain consistent terminology\n- Preserve formatting",
      "permission": {
        "read": "allow",
        "edit": {
          "src/i18n/.*\\.json$": "allow",
          "*": "deny"
        }
      }
    }
  }
}
```

## Not Migrated (Future Phases)

The following Kilocode features are not yet migrated:

| Feature | Status | Notes |
|---------|--------|-------|
| Rules (`.kilocode/rules/`) | Phase 2 | Will map to `instructions` array |
| Workflows (`.kilocode/workflows/`) | Phase 2 | Will map to custom commands |
| MCP Servers (`mcp_settings.json`) | Phase 2 | Will map to `mcp` config |
| Provider Settings | Phase 2 | Will map to `provider` config |
| Mode-specific API configs | Phase 2 | Different models per mode |
| Organization modes | Not planned | `source: organization` not preserved |

## Troubleshooting

### Mode not appearing

1. Check the file exists at the expected location
2. Verify YAML syntax is valid
3. Ensure the mode has a unique `slug`
4. Check it's not a default mode (which are skipped)

### Permissions not working

1. Verify the `groups` array is correctly formatted
2. For file restrictions, ensure `fileRegex` is a valid regex
3. Check the permission mapping table above

## Related Files

- [`modes-migrator.ts`](../modes-migrator.ts) - Core migration logic
- [`config-injector.ts`](../config-injector.ts) - Config building and injection
