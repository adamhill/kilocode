import type { Provider as SDK } from "ai"
import type { LanguageModelV2 } from "@openrouter/ai-sdk-provider"

/**
 * Options for creating a Kilo provider instance
 */
export interface KiloProviderOptions {
  /**
   * KiloCode authentication token
   */
  kilocodeToken?: string

  /**
   * Organization ID for multi-tenant setups
   */
  kilocodeOrganizationId?: string

  /**
   * Model ID to use (e.g., "anthropic/claude-sonnet-4")
   */
  kilocodeModel?: string

  /**
   * Specific OpenRouter provider to use
   */
  openRouterSpecificProvider?: string

  /**
   * Base URL for the KiloCode API
   * @default "https://api.kilo.ai/api/openrouter/"
   */
  baseURL?: string

  /**
   * Custom headers to include in requests
   */
  headers?: Record<string, string>

  /**
   * API key (alternative to kilocodeToken)
   */
  apiKey?: string

  /**
   * Provider name for identification
   */
  name?: string

  /**
   * Custom fetch function
   */
  fetch?: typeof fetch

  /**
   * Request timeout in milliseconds
   */
  timeout?: number | false
}

/**
 * Metadata for API requests
 */
export interface KiloMetadata {
  /**
   * Task ID for tracking
   */
  taskId?: string

  /**
   * Project ID for organization tracking
   */
  projectId?: string

  /**
   * Mode of operation (e.g., "code", "chat")
   */
  mode?: string
}

/**
 * Custom loader return type
 */
export interface CustomLoaderResult {
  /**
   * Whether to automatically load this provider
   */
  autoload: boolean

  /**
   * Custom function to get a model instance
   */
  getModel?: (sdk: SDK, modelID: string, options?: Record<string, any>) => Promise<LanguageModelV2>

  /**
   * Options to merge with provider configuration
   */
  options?: Record<string, any>
}

/**
 * Provider info type (minimal definition needed for loader)
 */
export interface ProviderInfo {
  id: string
  name: string
  source: "env" | "config" | "custom" | "api"
  env: string[]
  key?: string
  options: Record<string, any>
  models: Record<string, any>
}
