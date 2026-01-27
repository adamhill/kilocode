// kilocode_change - new file
/**
 * Kilo Gateway Profile Dialog
 *
 * Displays user profile information with a clickable usage details link.
 */

import { getTUIDependencies } from "../context.js"
import type { KilocodeProfile, KilocodeBalance } from "../../types.js"

interface DialogKiloProfileProps {
  profile: KilocodeProfile
  balance: KilocodeBalance | null
  currentOrgId?: string | null
}

export function DialogKiloProfile(props: DialogKiloProfileProps) {
  const deps = getTUIDependencies()
  const Link = deps.Link
  const TextAttributes = deps.TextAttributes
  const dialog = deps.useDialog()
  const { theme } = deps.useTheme()

  deps.useKeyboard((evt: any) => {
    if (evt.name === "return") {
      dialog.clear()
    }
  })

  // Get current organization info
  const currentOrg =
    props.currentOrgId && props.profile.organizations
      ? props.profile.organizations.find((org) => org.id === props.currentOrgId)
      : null

  const teamDisplay = currentOrg ? `${currentOrg.name} (${currentOrg.role})` : "Personal"

  const balanceDisplay =
    props.balance && props.balance.balance !== undefined && props.balance.balance !== null
      ? `$${props.balance.balance.toFixed(2)}`
      : null

  // Generate usage URL based on organization context
  const usageUrl = props.currentOrgId
    ? `https://app.kilo.ai/organizations/${props.currentOrgId}/usage-details`
    : "https://app.kilo.ai/usage"

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          Kilo Gateway Profile
        </text>
        <text fg={theme.textMuted}>esc</text>
      </box>
      <box paddingBottom={1}>
        {props.profile.name && <text fg={theme.text}>Name: {props.profile.name}</text>}
        {props.profile.email && <text fg={theme.text}>Email: {props.profile.email}</text>}
        <text fg={theme.text}>Team: {teamDisplay}</text>
        {balanceDisplay && <text fg={theme.text}>Balance: {balanceDisplay}</text>}
        <box marginTop={1}>
          <box flexDirection="row">
            <text fg={theme.text}>Usage Details: </text>
            <Link href={usageUrl} fg={theme.primary}>
              {usageUrl}
            </Link>
          </box>
        </box>
      </box>
      <box flexDirection="row" justifyContent="flex-end" paddingBottom={1}>
        <box paddingLeft={3} paddingRight={3} backgroundColor={theme.primary} onMouseUp={() => dialog.clear()}>
          <text fg={theme.selectedListItemText}>ok</text>
        </box>
      </box>
    </box>
  )
}
