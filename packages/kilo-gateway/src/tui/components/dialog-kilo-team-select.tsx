// kilocode_change - Kilo Gateway TUI component
/**
 * Kilo Gateway Team Selection Dialog
 *
 * Allows switching between organizations and personal account.
 * Marks the current team with "→ (current)" indicator.
 */

import { getTUIDependencies } from "../context.js"
import type { Organization } from "../../types.js"
import { getOrganizationOptions } from "../helpers.js"

interface DialogKiloTeamSelectProps {
  organizations: Organization[]
  currentOrgId?: string | null
  onSelect: (orgId: string | null) => Promise<void>
}

export function DialogKiloTeamSelect(props: DialogKiloTeamSelectProps) {
  const deps = getTUIDependencies()
  // Get formatted options with current markers
  const options = getOrganizationOptions(props.organizations, props.currentOrgId || undefined)

  return (
    <deps.DialogSelect
      title="Select Team"
      options={options}
      current={props.currentOrgId || null}
      onSelect={async (option: any) => {
        await props.onSelect(option.value)
      }}
    />
  )
}
