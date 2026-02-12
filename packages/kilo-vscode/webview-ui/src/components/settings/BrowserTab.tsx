import { Component, createSignal, onCleanup, onMount } from "solid-js"
import { Switch } from "@kilocode/kilo-ui/switch"
import { useVSCode } from "../../context/vscode"
import type { BrowserSettings } from "../../types/messages"

const BrowserTab: Component = () => {
  const { postMessage, onMessage } = useVSCode()

  const [settings, setSettings] = createSignal<BrowserSettings>({
    enabled: false,
    useSystemChrome: true,
    headless: false,
  })

  onMount(() => {
    postMessage({ type: "requestBrowserSettings" })
  })

  // Subscribe outside onMount to catch early pushes (per AGENTS.md pattern)
  const unsubscribe = onMessage((msg) => {
    if (msg.type === "browserSettingsLoaded") {
      setSettings(msg.settings)
    }
  })
  onCleanup(unsubscribe)

  const update = (key: keyof BrowserSettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    postMessage({ type: "updateSetting", key: `browserAutomation.${key}`, value })
  }

  return (
    <div style={{ display: "flex", "flex-direction": "column", gap: "16px" }}>
      {/* Info text */}
      <div
        style={{
          background: "var(--vscode-textBlockQuote-background)",
          border: "1px solid var(--vscode-panel-border)",
          "border-radius": "4px",
          padding: "12px 16px",
        }}
      >
        <p
          style={{
            "font-size": "12px",
            color: "var(--vscode-descriptionForeground)",
            margin: 0,
            "line-height": "1.5",
          }}
        >
          When enabled, the AI agent can interact with web pages — navigating, clicking, typing, and taking screenshots.
          A Chrome window will open so you can watch the agent work.
        </p>
      </div>

      {/* Enable toggle */}
      <SettingsRow
        title="Enable Browser Automation"
        description="Register the Playwright MCP server with the CLI backend."
      >
        <Switch checked={settings().enabled} onChange={(checked: boolean) => update("enabled", checked)} />
      </SettingsRow>

      {/* Use System Chrome */}
      <SettingsRow
        title="Use System Chrome"
        description="Use your installed Chrome browser instead of a separate Chromium instance."
      >
        <Switch
          checked={settings().useSystemChrome}
          onChange={(checked: boolean) => update("useSystemChrome", checked)}
        />
      </SettingsRow>

      {/* Headless mode */}
      <SettingsRow title="Headless Mode" description="Run in headless mode (no visible browser window).">
        <Switch checked={settings().headless} onChange={(checked: boolean) => update("headless", checked)} />
      </SettingsRow>
    </div>
  )
}

/** Reusable settings row matching the desktop app pattern. */
const SettingsRow: Component<{ title: string; description: string; children: any }> = (props) => {
  return (
    <div
      style={{
        display: "flex",
        "align-items": "center",
        "justify-content": "space-between",
        padding: "12px 16px",
        background: "var(--vscode-editor-background)",
        border: "1px solid var(--vscode-panel-border)",
        "border-radius": "4px",
        gap: "16px",
      }}
    >
      <div style={{ display: "flex", "flex-direction": "column", gap: "2px", flex: 1 }}>
        <span style={{ "font-size": "13px", color: "var(--vscode-foreground)", "font-weight": "500" }}>
          {props.title}
        </span>
        <span style={{ "font-size": "12px", color: "var(--vscode-descriptionForeground)", "line-height": "1.4" }}>
          {props.description}
        </span>
      </div>
      <div style={{ "flex-shrink": 0 }}>{props.children}</div>
    </div>
  )
}

export default BrowserTab
