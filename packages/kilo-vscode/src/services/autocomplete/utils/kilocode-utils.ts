// kilocode_change - simplified, removed @roo-code/types dependency

const KILO_BASE_URL = "https://api.kilo.ai"

/**
 * Check if the Kilocode account has a positive balance
 * @param kilocodeToken - The Kilocode JWT token
 * @param kilocodeOrganizationId - Optional organization ID to include in headers
 * @returns Promise<boolean> - True if balance > 0, false otherwise
 */
export async function checkKilocodeBalance(kilocodeToken: string, kilocodeOrganizationId?: string): Promise<boolean> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${kilocodeToken}`,
  }

  if (kilocodeOrganizationId) {
    headers["X-KiloCode-OrganizationId"] = kilocodeOrganizationId
  }

  const response = await fetch(`${KILO_BASE_URL}/api/profile/balance`, {
    headers,
  })

  if (!response.ok) {
    return false
  }

  const data = (await response.json()) as { balance?: number }
  const balance = data.balance ?? 0
  return balance > 0
}
