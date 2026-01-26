# @opencode-ai/kilo-provider

KiloCode provider for OpenCode AI SDK. This package provides a custom AI provider that wraps the OpenRouter SDK with KiloCode-specific configuration including custom authentication, headers, and base URL.

## Installation

```bash
bun install @opencode-ai/kilo-provider
```

## Usage

### Basic Usage

```typescript
import { createKilo } from "@opencode-ai/kilo-provider"

const provider = createKilo({
  kilocodeToken: process.env.KILOCODE_API_KEY,
})

const model = provider.languageModel("anthropic/claude-sonnet-4")
```

### With Organization ID

```typescript
const provider = createKilo({
  kilocodeToken: process.env.KILOCODE_API_KEY,
  kilocodeOrganizationId: "org-123",
})
```

### Custom Base URL

```typescript
const provider = createKilo({
  kilocodeToken: process.env.KILOCODE_API_KEY,
  baseURL: "https://custom.kilo.ai/api/",
})
```

### With Custom Headers

```typescript
const provider = createKilo({
  kilocodeToken: process.env.KILOCODE_API_KEY,
  headers: {
    "X-Custom-Header": "value",
  },
})
```

## Configuration in OpenCode

Add the kilo provider to your `.opencode/config.json`:

```json
{
  "provider": {
    "kilo": {
      "name": "KiloCode",
      "env": ["KILOCODE_API_KEY", "KILO_API_KEY"],
      "api": "https://api.kilo.ai/api/openrouter/",
      "npm": "@opencode-ai/kilo-provider",
      "options": {
        "kilocodeToken": "your-token-here",
        "kilocodeOrganizationId": "org-123"
      }
    }
  },
  "model": "kilo/anthropic/claude-sonnet-4"
}
```

## Environment Variables

The provider supports these environment variables:

- `KILOCODE_API_KEY` or `KILO_API_KEY` - API authentication token
- `KILOCODE_ORGANIZATION_ID` - Organization ID for multi-tenant setups
- `KILOCODE_API_URL` - Custom API base URL (defaults to https://api.kilo.ai/api/)
- `KILOCODE_EDITOR_NAME` - Custom editor name for tracking (defaults to "opencode")

## Features

- ✅ KiloCode API endpoint integration
- ✅ Custom authentication via `kilocodeToken`
- ✅ Custom headers (X-KILOCODE-ORGANIZATIONID, X-KILOCODE-TASKID, etc.)
- ✅ Auto-loading based on authentication availability
- ✅ Anonymous mode for free models when no auth provided
- ✅ Based on OpenRouter SDK with KiloCode configuration

## API

### `createKilo(options)`

Creates a KiloCode provider instance.

**Options:**

- `kilocodeToken?: string` - KiloCode authentication token
- `kilocodeOrganizationId?: string` - Organization ID for multi-tenant setups
- `kilocodeModel?: string` - Model ID to use
- `openRouterSpecificProvider?: string` - Specific OpenRouter provider to use
- `baseURL?: string` - Base URL for the KiloCode API
- `headers?: Record<string, string>` - Custom headers to include
- `apiKey?: string` - API key (alternative to kilocodeToken)
- `name?: string` - Provider name for identification
- `fetch?: typeof fetch` - Custom fetch function
- `timeout?: number | false` - Request timeout in milliseconds

### `kiloCustomLoader(provider)`

Custom loader function for the kilo provider. Used internally by OpenCode's provider system.

### `buildKiloHeaders(metadata, options)`

Build KiloCode-specific headers from metadata and options.

### `getEditorNameHeader()`

Get editor name header value. Defaults to "opencode".

### `getKiloUrlFromToken(defaultUrl, token)`

Parse KiloCode URL from token.

### `isValidKilocodeToken(token)`

Validate KiloCode token format.

### `getApiKey(options)`

Get API key from options or environment.

## License

MIT
