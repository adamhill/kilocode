import { Component, createSignal, onCleanup } from "solid-js"
import { Switch } from "@kilocode/kilo-ui/switch"
import { Select } from "@kilocode/kilo-ui/select"
import { Card } from "@kilocode/kilo-ui/card"
import { useVSCode } from "../../context/vscode"
import type { ExtensionMessage } from "../../types/messages"

interface SoundOption {
  value: string
  label: string
}

const SOUND_OPTIONS: SoundOption[] = [
  { value: "default", label: "Default" },
  { value: "none", label: "None" },
]

const NotificationsTab: Component = () => {
  const vscode = useVSCode()

  const [agentNotify, setAgentNotify] = createSignal(true)
  const [permNotify, setPermNotify] = createSignal(true)
  const [errorNotify, setErrorNotify] = createSignal(true)
  const [agentSound, setAgentSound] = createSignal("default")
  const [permSound, setPermSound] = createSignal("default")
  const [errorSound, setErrorSound] = createSignal("default")

  const unsubscribe = vscode.onMessage((message: ExtensionMessage) => {
    if (message.type !== "localSettingsLoaded") {
      return
    }
    const s = message.settings
    if (s["notifications.agent"] !== undefined) setAgentNotify(s["notifications.agent"] as boolean)
    if (s["notifications.permissions"] !== undefined) setPermNotify(s["notifications.permissions"] as boolean)
    if (s["notifications.errors"] !== undefined) setErrorNotify(s["notifications.errors"] as boolean)
    if (s["sounds.agent"] !== undefined) setAgentSound(s["sounds.agent"] as string)
    if (s["sounds.permissions"] !== undefined) setPermSound(s["sounds.permissions"] as string)
    if (s["sounds.errors"] !== undefined) setErrorSound(s["sounds.errors"] as string)
  })

  onCleanup(unsubscribe)
  vscode.postMessage({ type: "requestLocalSettings" })

  const saveSetting = (key: string, value: unknown) => {
    vscode.postMessage({ type: "saveLocalSetting", key, value })
  }

  const SettingsRow: Component<{ label: string; description: string; last?: boolean; children: any }> = (props) => (
    <div
      data-slot="settings-row"
      style={{
        display: "flex",
        "align-items": "center",
        "justify-content": "space-between",
        padding: "8px 0",
        "border-bottom": props.last ? "none" : "1px solid var(--border-weak-base)",
      }}
    >
      <div style={{ flex: 1, "min-width": 0, "margin-right": "12px" }}>
        <div style={{ "font-weight": "500" }}>{props.label}</div>
        <div
          style={{
            "font-size": "11px",
            color: "var(--text-weak-base, var(--vscode-descriptionForeground))",
          }}
        >
          {props.description}
        </div>
      </div>
      {props.children}
    </div>
  )

  return (
    <div>
      <h4 style={{ "margin-top": "0", "margin-bottom": "8px" }}>Notifications</h4>
      <Card>
        <div style={{ padding: "8px 0", "border-bottom": "1px solid var(--border-weak-base)" }}>
          <Switch
            checked={agentNotify()}
            onChange={(checked) => {
              setAgentNotify(checked)
              saveSetting("notifications.agent", checked)
            }}
            description="Show notification when agent completes a task"
          >
            Agent Completion
          </Switch>
        </div>
        <div style={{ padding: "8px 0", "border-bottom": "1px solid var(--border-weak-base)" }}>
          <Switch
            checked={permNotify()}
            onChange={(checked) => {
              setPermNotify(checked)
              saveSetting("notifications.permissions", checked)
            }}
            description="Show notification on permission requests"
          >
            Permission Requests
          </Switch>
        </div>
        <div style={{ padding: "8px 0" }}>
          <Switch
            checked={errorNotify()}
            onChange={(checked) => {
              setErrorNotify(checked)
              saveSetting("notifications.errors", checked)
            }}
            description="Show notification on errors"
          >
            Errors
          </Switch>
        </div>
      </Card>

      <h4 style={{ "margin-top": "16px", "margin-bottom": "8px" }}>Sounds</h4>
      <Card>
        <SettingsRow label="Agent Completion Sound" description="Sound to play when agent completes">
          <Select
            options={SOUND_OPTIONS}
            current={SOUND_OPTIONS.find((o) => o.value === agentSound())}
            value={(o) => o.value}
            label={(o) => o.label}
            onSelect={(o) => {
              if (o) {
                setAgentSound(o.value)
                saveSetting("sounds.agent", o.value)
              }
            }}
            variant="secondary"
            size="small"
            triggerVariant="settings"
          />
        </SettingsRow>
        <SettingsRow label="Permission Request Sound" description="Sound to play on permission requests">
          <Select
            options={SOUND_OPTIONS}
            current={SOUND_OPTIONS.find((o) => o.value === permSound())}
            value={(o) => o.value}
            label={(o) => o.label}
            onSelect={(o) => {
              if (o) {
                setPermSound(o.value)
                saveSetting("sounds.permissions", o.value)
              }
            }}
            variant="secondary"
            size="small"
            triggerVariant="settings"
          />
        </SettingsRow>
        <SettingsRow label="Error Sound" description="Sound to play on errors" last>
          <Select
            options={SOUND_OPTIONS}
            current={SOUND_OPTIONS.find((o) => o.value === errorSound())}
            value={(o) => o.value}
            label={(o) => o.label}
            onSelect={(o) => {
              if (o) {
                setErrorSound(o.value)
                saveSetting("sounds.errors", o.value)
              }
            }}
            variant="secondary"
            size="small"
            triggerVariant="settings"
          />
        </SettingsRow>
      </Card>
    </div>
  )
}

export default NotificationsTab
