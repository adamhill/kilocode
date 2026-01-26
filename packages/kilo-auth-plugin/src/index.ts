import type { Plugin } from "@opencode-ai/plugin"
import { authenticateWithDeviceAuth } from "./device-auth.js"
import { KILO_API_BASE, TOKEN_EXPIRATION_MS } from "./constants.js"

/**
 * Kilo Gateway Authentication Plugin
 *
 * Provides device authorization flow for Kilo Gateway
 * to integrate with OpenCode's auth system.
 */
export const KiloAuthPlugin: Plugin = async (ctx) => {
  return {
    auth: {
      provider: "kilo",
      async loader(getAuth, providerInfo) {
        // Get the stored auth
        const auth = await getAuth()
        if (!auth) return {}

        // For API auth, the key is the token directly
        if (auth.type === "api") {
          return {
            kilocodeToken: auth.key,
          }
        }

        // For OAuth auth, access token contains the Kilo token
        // The accountId field is in OpenCode's Auth type but not exposed to SDK
        // so we access it as a property on the auth object
        if (auth.type === "oauth") {
          const result: Record<string, string> = {
            kilocodeToken: auth.access,
          }
          // accountId is present in OpenCode's OAuth schema but not in SDK's
          const maybeAccountId = (auth as any).accountId
          if (maybeAccountId) {
            result.kilocodeOrganizationId = maybeAccountId
          }
          return result
        }

        return {}
      },
      methods: [
        {
          type: "oauth",
          label: "Kilo Gateway (Device Authorization)",
          async authorize() {
            // Execute the device auth flow
            const result = await authenticateWithDeviceAuth()

            // Return in the format expected by OpenCode
            return {
              url: KILO_API_BASE,
              instructions: "Authenticated successfully with Kilo Gateway",
              method: "auto",
              async callback() {
                // Store using OAuth format to include organization ID
                // accountId field stores the organization ID
                return {
                  type: "success",
                  provider: "kilo",
                  refresh: result.token, // Store token here too for redundancy
                  access: result.token, // Primary token storage
                  expires: Date.now() + TOKEN_EXPIRATION_MS,
                  ...(result.organizationId && { accountId: result.organizationId }),
                }
              },
            }
          },
        },
      ],
    },
  }
}

export default KiloAuthPlugin
