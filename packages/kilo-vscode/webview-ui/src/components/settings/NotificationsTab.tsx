import { Component, createSignal, onCleanup } from "solid-js"
import { useVSCode } from "../../context/vscode"
import type { ExtensionMessage } from "../../types/messages"

const NotificationsTab: Component = () => {
  const vscode = useVSCode()

  const [agentNotify, setAgentNotify] = createSignal(true)
  const [permNotify, setPermNotify] = createSignal(true)
  const [errorNotify, setErrorNotify] = createSignal(true)
  const [agentSound, setAgentSound] = createSignal("default")
  const [permSound, setPermSound] = createSignal("default")
  const [errorSound, setErrorSound] = createSignal("default")

  // Listen for local settings loaded
  const unsubscribe = vscode.onMessage((message: ExtensionMessage) => {
    if (message.type !== "localSettingsLoaded") {
      return
    }
    const s = message.settings
    if (s["notifications.agent"] !== undefined) {
      setAgentNotify(s["notifications.agent"] as boolean)
    }
    if (s["notifications.permissions"] !== undefined) {
      setPermNotify(s["notifications.permissions"] as boolean)
    }
    if (s["notifications.errors"] !== undefined) {
      setErrorNotify(s["notifications.errors"] as boolean)
    }
    if (s["sounds.agent"] !== undefined) {
      setAgentSound(s["sounds.agent"] as string)
    }
    if (s["sounds.permissions"] !== undefined) {
      setPermSound(s["sounds.permissions"] as string)
    }
    if (s["sounds.errors"] !== undefined) {
      setErrorSound(s["sounds.errors"] as string)
    }
  })

  onCleanup(unsubscribe)

  // Request settings
  vscode.postMessage({ type: "requestLocalSettings" })

  const saveSetting = (key: string, value: unknown) => {
    vscode.postMessage({ type: "saveLocalSetting", key, value })
  }

  const selectStyle = {
    padding: "4px 8px",
    "border-radius": "4px",
    border: "1px solid var(--vscode-dropdown-border, var(--vscode-panel-border))",
    background: "var(--vscode-dropdown-background)",
    color: "var(--vscode-dropdown-foreground)",
    "font-size": "12px",
    "font-family": "var(--vscode-font-family)",
    cursor: "pointer",
    outline: "none",
    "min-width": "100px",
  }

  interface RowProps {
    label: string
    description: string
    last?: boolean
    children: any
  }

  const Row: Component<RowProps> = (props) => (
    <div
      style={{
        display: "flex",
        "align-items": "center",
        "justify-content": "space-between",
        padding: "10px 12px",
        background: "var(--vscode-editor-background)",
        "border-bottom": props.last ? "none" : "1px solid var(--vscode-panel-border)",
      }}
    >
      <div style={{ flex: 1, "min-width": 0, "margin-right": "12px" }}>
        <div style={{ "font-size": "12px", "font-weight": "500", color: "var(--vscode-foreground)" }}>
          {props.label}
        </div>
        <div style={{ "font-size": "11px", color: "var(--vscode-descriptionForeground)", "margin-top": "2px" }}>
          {props.description}
        </div>
      </div>
      {props.children}
    </div>
  )

  return (
    <div>
      {/* Notification toggles */}
      <h4 style={{ "font-size": "13px", "margin-top": "0", "margin-bottom": "8px", color: "var(--vscode-foreground)" }}>
        Notifications
      </h4>
      <div
        style={{
          border: "1px solid var(--vscode-panel-border)",
          "border-radius": "4px",
          overflow: "hidden",
          "margin-bottom": "16px",
        }}
      >
        <Row label="Agent Completion" description="Show notification when agent completes a task">
          <label style={{ display: "flex", "align-items": "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={agentNotify()}
              onChange={(e) => {
                setAgentNotify(e.currentTarget.checked)
                saveSetting("notifications.agent", e.currentTarget.checked)
              }}
              style={{ cursor: "pointer" }}
            />
          </label>
        </Row>
        <Row label="Permission Requests" description="Show notification on permission requests">
          <label style={{ display: "flex", "align-items": "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={permNotify()}
              onChange={(e) => {
                setPermNotify(e.currentTarget.checked)
                saveSetting("notifications.permissions", e.currentTarget.checked)
              }}
              style={{ cursor: "pointer" }}
            />
          </label>
        </Row>
        <Row label="Errors" description="Show notification on errors" last>
          <label style={{ display: "flex", "align-items": "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={errorNotify()}
              onChange={(e) => {
                setErrorNotify(e.currentTarget.checked)
                saveSetting("notifications.errors", e.currentTarget.checked)
              }}
              style={{ cursor: "pointer" }}
            />
          </label>
        </Row>
      </div>

      {/* Sound settings */}
      <h4 style={{ "font-size": "13px", "margin-top": "0", "margin-bottom": "8px", color: "var(--vscode-foreground)" }}>
        Sounds
      </h4>
      <div
        style={{
          border: "1px solid var(--vscode-panel-border)",
          "border-radius": "4px",
          overflow: "hidden",
        }}
      >
        <Row label="Agent Completion Sound" description="Sound to play when agent completes">
          <select
            style={selectStyle}
            value={agentSound()}
            onChange={(e) => {
              setAgentSound(e.currentTarget.value)
              saveSetting("sounds.agent", e.currentTarget.value)
            }}
          >
            <option value="default">Default</option>
            <option value="none">None</option>
          </select>
        </Row>
        <Row label="Permission Request Sound" description="Sound to play on permission requests">
          <select
            style={selectStyle}
            value={permSound()}
            onChange={(e) => {
              setPermSound(e.currentTarget.value)
              saveSetting("sounds.permissions", e.currentTarget.value)
            }}
          >
            <option value="default">Default</option>
            <option value="none">None</option>
          </select>
        </Row>
        <Row label="Error Sound" description="Sound to play on errors" last>
          <select
            style={selectStyle}
            value={errorSound()}
            onChange={(e) => {
              setErrorSound(e.currentTarget.value)
              saveSetting("sounds.errors", e.currentTarget.value)
            }}
          >
            <option value="default">Default</option>
            <option value="none">None</option>
          </select>
        </Row>
      </div>
    </div>
  )
}

export default NotificationsTab
