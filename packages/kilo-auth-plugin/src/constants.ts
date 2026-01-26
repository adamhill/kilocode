/**
 * Kilo Auth Plugin Configuration Constants
 * Centralized configuration for all API endpoints and settings
 */

/** Base URL for Kilo API */
export const KILO_API_BASE = "https://api.kilo.ai"

/** Device auth polling interval in milliseconds */
export const POLL_INTERVAL_MS = 3000

/** Default model to use as fallback */
export const DEFAULT_MODEL = "anthropic/claude-sonnet-4"

/** Token expiration duration in milliseconds (1 year) */
export const TOKEN_EXPIRATION_MS = 365 * 24 * 60 * 60 * 1000
