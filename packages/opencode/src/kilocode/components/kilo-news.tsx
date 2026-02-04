// kilocode_change - new file
/**
 * Kilo News Component
 *
 * Self-contained component that fetches and displays Kilo news/notifications.
 * Shows a banner on the home screen; clicking opens a dialog with all news items.
 */

import { createMemo, createSignal, onMount, Show } from "solid-js"
import { useSync } from "@tui/context/sync"
import { useSDK } from "@tui/context/sdk"
import { useDialog } from "@tui/ui/dialog"
import type { KilocodeNotification } from "@kilocode/kilo-gateway"
import { NotificationBanner } from "./notification-banner.js"
import { DialogKiloNotifications } from "./dialog-kilo-notifications.js"

export function KiloNews() {
  const sync = useSync()
  const sdk = useSDK()
  const dialog = useDialog()

  const [notifications, setNotifications] = createSignal<KilocodeNotification[]>([])
  const isKiloConnected = createMemo(() => sync.data.provider_next.connected.includes("kilo"))

  const openNewsDialog = () => {
    const items = notifications()
    if (items.length > 0) {
      dialog.replace(() => <DialogKiloNotifications notifications={items} />)
    }
  }

  onMount(async () => {
    // Wait for sync to complete
    await new Promise<void>((resolve) => {
      const check = () => {
        if (sync.status === "complete") resolve()
        else setTimeout(check, 100)
      }
      check()
    })

    if (!isKiloConnected()) return

    const result = await sdk.client.kilo.notifications()
    const items = result.data
    if (items && items.length > 0) {
      setNotifications(items)
    }
  })

  return (
    <Show when={notifications().length > 0}>
      <NotificationBanner
        notification={notifications()[0]}
        totalCount={notifications().length}
        onClick={openNewsDialog}
      />
    </Show>
  )
}
