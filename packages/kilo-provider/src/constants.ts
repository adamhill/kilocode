/**
 * Kilo Provider Configuration Constants
 * Centralized configuration for all API endpoints, headers, and settings
 */

/** Base URL for Kilo API */
export const KILO_API_BASE = "https://api.kilo.ai/api/"

/** Default base URL for OpenRouter-compatible endpoint */
export const KILO_OPENROUTER_BASE = "https://api.kilo.ai/api/openrouter"

/** User-Agent header value for requests */
export const USER_AGENT = "opencode-kilo-provider"

/** Content-Type header value for requests */
export const CONTENT_TYPE = "application/json"

/** Default provider name */
export const DEFAULT_PROVIDER_NAME = "kilo"

/** Default API key for anonymous requests */
export const ANONYMOUS_API_KEY = "anonymous"

/** Fetch timeout for model requests in milliseconds (10 seconds) */
export const MODELS_FETCH_TIMEOUT_MS = 10 * 1000

/**
 * Header constants for KiloCode API requests
 */
export const HEADER_ORGANIZATIONID = "X-KILOCODE-ORGANIZATIONID"
export const HEADER_TASKID = "X-KILOCODE-TASKID"
export const HEADER_PROJECTID = "X-KILOCODE-PROJECTID"
export const HEADER_TESTER = "X-KILOCODE-TESTER"
export const HEADER_EDITORNAME = "X-KILOCODE-EDITORNAME"

/** Default editor name value */
export const DEFAULT_EDITOR_NAME = "opencode"

/** Environment variable name for custom editor name */
export const ENV_EDITOR_NAME = "KILOCODE_EDITOR_NAME"

/** Tester header value for suppressing warnings */
export const TESTER_SUPPRESS_VALUE = "SUPPRESS"
