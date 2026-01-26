import { select } from "@clack/prompts"
import type { KilocodeProfile, Organization } from "./types.js"
import { KILO_API_BASE, DEFAULT_MODEL } from "./constants.js"

/**
 * Fetch user profile data from Kilo API
 * @param token - The Kilo API token
 * @returns Profile data including user info and organizations
 * @throws Error if request fails
 */
export async function getKiloProfile(token: string): Promise<KilocodeProfile> {
  const response = await fetch(`${KILO_API_BASE}/api/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Invalid token")
    }
    throw new Error(`Failed to fetch profile: ${response.status}`)
  }

  const data = await response.json()
  return data as KilocodeProfile
}

/**
 * Fetch the default model from Kilo API
 * @param token - The Kilo API token
 * @param organizationId - Optional organization ID for org-specific defaults
 * @returns The default model ID, or falls back to a default on error
 */
export async function getKiloDefaultModel(token: string, organizationId?: string): Promise<string> {
  const path = organizationId ? `/api/organizations/${organizationId}/defaults` : `/api/defaults`
  const url = `${KILO_API_BASE}${path}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    console.warn(`Failed to fetch default model, using fallback: ${DEFAULT_MODEL}`)
    return DEFAULT_MODEL
  }

  const data = await response.json()
  const defaultModel = data.defaultModel

  if (!defaultModel) {
    console.warn(`No default model returned, using fallback: ${DEFAULT_MODEL}`)
    return DEFAULT_MODEL
  }

  return defaultModel
}

/**
 * Prompt user to select an organization or personal account
 * @param organizations List of organizations the user belongs to
 * @returns Organization ID or undefined for personal account
 */
export async function promptOrganizationSelection(organizations: Organization[]): Promise<string | undefined> {
  if (!organizations || organizations.length === 0) {
    return undefined
  }

  const choices = [
    { label: "Personal Account", value: "personal", hint: "Use your personal account" },
    ...organizations.map((org) => ({
      label: org.name,
      value: org.id,
      hint: `Organization`,
    })),
  ]

  const result = await select({
    message: "Select account",
    options: choices,
  })

  if (result === "personal") {
    return undefined
  }

  return result as string
}
