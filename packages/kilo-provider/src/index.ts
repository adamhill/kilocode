/**
 * @opencode-ai/kilo-provider
 *
 * KiloCode provider for OpenCode AI SDK
 *
 * This package provides a KiloCode-specific AI provider that wraps
 * the OpenRouter SDK with custom authentication, headers, and configuration.
 *
 * @example
 * ```typescript
 * import { createKilo } from "@opencode-ai/kilo-provider"
 *
 * const provider = createKilo({
 *   kilocodeToken: process.env.KILOCODE_API_KEY,
 *   kilocodeOrganizationId: "org-123"
 * })
 *
 * const model = provider.languageModel("anthropic/claude-sonnet-4")
 * ```
 */

export { createKilo } from "./provider"
export { createKiloDebug } from "./provider-debug"
export { kiloCustomLoader } from "./loader"
export { buildKiloHeaders, getEditorNameHeader } from "./headers"
export { getKiloUrlFromToken, isValidKilocodeToken, getApiKey } from "./auth"
export { fetchKiloModels } from "./models"
export type { KiloProviderOptions, KiloMetadata, CustomLoaderResult, ProviderInfo } from "./types"

// Export constants for external use
export {
  KILO_API_BASE,
  KILO_OPENROUTER_BASE,
  USER_AGENT,
  CONTENT_TYPE,
  DEFAULT_PROVIDER_NAME,
  ANONYMOUS_API_KEY,
  MODELS_FETCH_TIMEOUT_MS,
  HEADER_ORGANIZATIONID,
  HEADER_TASKID,
  HEADER_PROJECTID,
  HEADER_TESTER,
  HEADER_EDITORNAME,
  DEFAULT_EDITOR_NAME,
  ENV_EDITOR_NAME,
  TESTER_SUPPRESS_VALUE,
} from "./constants"

// Re-export types from OpenRouter for convenience
export type { LanguageModelV2 } from "@openrouter/ai-sdk-provider"
