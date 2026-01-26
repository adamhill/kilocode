# @opencode-ai/kilo-auth-plugin

Authentication plugin for Kilo Gateway integration with OpenCode.

## Overview

This plugin provides device authorization flow for authenticating with Kilo Gateway, making it appear as an authentication option in `opencode auth login`.

## Features

- **Device Authorization Flow**: OAuth-style device flow for secure authentication
- **Organization Support**: Select between personal account and organization accounts
- **Default Model Fetching**: Automatically fetches and configures default model settings
- **Progress Display**: Visual feedback during the authorization process

## Architecture

The plugin consists of:

- **polling.ts**: Generic polling utilities with timeout and progress tracking
- **device-auth.ts**: Complete device authorization flow implementation
- **profile.ts**: Profile and organization fetching/selection
- **index.ts**: Plugin registration with OpenCode

## API Endpoints

The plugin communicates with the following Kilo Gateway endpoints:

- `POST /api/device-auth/codes` - Initiate device authorization
- `GET /api/device-auth/codes/{code}` - Poll authorization status
- `GET /api/profile` - Fetch user profile and organizations
- `GET /api/defaults` - Fetch default model configuration
- `GET /api/organizations/{id}/defaults` - Fetch org-specific defaults

## Usage

The plugin is automatically registered as an internal plugin in OpenCode. When users run:

```bash
opencode auth login
```

"Kilo Gateway (Device Authorization)" will appear as the first authentication option.

## Development

```bash
# Install dependencies
bun install

# Type check
bun run typecheck

# Build
bun run build
```

## Integration

This plugin works in tandem with [`@opencode-ai/kilo-provider`](../kilo-provider) to provide complete Kilo Gateway integration with OpenCode.
