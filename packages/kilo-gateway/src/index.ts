// ============================================================================
// Plugin
// ============================================================================
export { KiloAuthPlugin, default } from "./plugin.js"

// ============================================================================
// Provider
// ============================================================================
export { createKilo } from "./provider.js"
export { createKiloDebug } from "./provider-debug.js"
export { kiloCustomLoader } from "./loader.js"
export { buildKiloHeaders, getEditorNameHeader, DEFAULT_HEADERS } from "./headers.js"

// ============================================================================
// Auth
// ============================================================================
export { authenticateWithDeviceAuth } from "./auth/device-auth.js"
export { authenticateWithDeviceAuthTUI } from "./auth/device-auth-tui.js"
export { getKiloUrlFromToken, isValidKilocodeToken, getApiKey } from "./auth/token.js"
export { poll, formatTimeRemaining } from "./auth/polling.js"

// ============================================================================
// API
// ============================================================================
export {
  fetchProfile,
  fetchBalance,
  fetchProfileWithBalance,
  fetchDefaultModel,
  getKiloProfile,
  getKiloBalance,
  getKiloDefaultModel,
  promptOrganizationSelection,
} from "./api/profile.js"
export { fetchKiloModels } from "./api/models.js"

// ============================================================================
// TUI Helpers
// ============================================================================
export { formatProfileInfo, getOrganizationOptions, getDefaultOrganizationSelection } from "./tui/helpers.js"

// ============================================================================
// TUI Components (optional - requires solid-js and @opentui/*)
// ============================================================================
export { registerKiloCommands } from "./tui/commands/kilo-commands.js"
export { DialogKiloTeamSelect } from "./tui/components/dialog-kilo-team-select.js"
export { DialogKiloOrganization } from "./tui/components/dialog-kilo-organization.js"
export { KiloAutoMethod } from "./tui/components/dialog-kilo-auto-method.js"

// ============================================================================
// Server Routes (optional - requires hono and OpenCode dependencies)
// ============================================================================
export { createKiloRoutes } from "./server/routes.js"

// ============================================================================
// Types
// ============================================================================
export type {
  // Auth types
  DeviceAuthInitiateResponse,
  DeviceAuthPollResponse,
  Organization,
  KilocodeProfile,
  KilocodeBalance,
  PollOptions,
  PollResult,
  // Provider types
  KiloProviderOptions,
  KiloMetadata,
  CustomLoaderResult,
  ProviderInfo,
  LanguageModelV2,
} from "./types.js"

// ============================================================================
// Constants
// ============================================================================
export {
  KILO_API_BASE,
  KILO_OPENROUTER_BASE,
  POLL_INTERVAL_MS,
  DEFAULT_MODEL,
  TOKEN_EXPIRATION_MS,
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
} from "./api/constants.js"
