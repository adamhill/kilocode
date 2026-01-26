// kilocode_change - Kilo Gateway TUI component
/**
 * Kilo Gateway Organization Selection Dialog
 *
 * Shows organization selection after OAuth authentication when user has multiple organizations.
 * Pre-selects the first organization by default.
 */

import { DialogSelect } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"
import { useSync } from "@tui/context/sync"
import type { Organization } from "../../types.js"
import { getOrganizationOptions, getDefaultOrganizationSelection } from "../helpers.js"

// These types are OpenCode-internal and imported at runtime
type UseSDK = any
type UseTheme = any
type DialogModel = any

interface DialogKiloOrganizationProps {
  organizations: Organization[]
  userEmail: string
  providerID: string
  useSDK: () => UseSDK
  useTheme: () => UseTheme
  DialogModel: DialogModel
}

export function DialogKiloOrganization(props: DialogKiloOrganizationProps) {
  const dialog = useDialog()
  const sync = useSync()
  const sdk = props.useSDK()

  // Get formatted options with current markers
  const options = getOrganizationOptions(props.organizations)

  // Pre-select first organization (user requirement)
  const defaultSelection = getDefaultOrganizationSelection(props.organizations)

  return (
    <DialogSelect
      title={`Select Account (${props.userEmail})`}
      options={options}
      current={defaultSelection}
      onSelect={async (option) => {
        const orgId = option.value

        // Update auth to include organization ID using server endpoint
        await sdk.client.kilo.organization.set({
          organizationId: orgId,
        })

        // Refresh provider state to reload with new organization context
        await sdk.client.instance.dispose()
        await sync.bootstrap()

        // Proceed to model selection
        dialog.replace(() => <props.DialogModel providerID={props.providerID} />)
      }}
    />
  )
}
