import { Component, createSignal, onCleanup } from "solid-js"
import { Switch } from "@kilocode/kilo-ui/switch"
import { useVSCode } from "../../context/vscode"
import type { ExtensionMessage } from "../../types/messages"

/** Reusable settings row matching the BrowserTab pattern. */
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

const AutocompleteTab: Component = () => {
  const vscode = useVSCode()

  const [enableAutoTrigger, setEnableAutoTrigger] = createSignal(true)
  const [enableSmartInlineTaskKeybinding, setEnableSmartInlineTaskKeybinding] = createSignal(false)
  const [enableChatAutocomplete, setEnableChatAutocomplete] = createSignal(false)

  const unsubscribe = vscode.onMessage((message: ExtensionMessage) => {
    if (message.type !== "autocompleteSettingsLoaded") {
      return
    }
    setEnableAutoTrigger(message.settings.enableAutoTrigger)
    setEnableSmartInlineTaskKeybinding(message.settings.enableSmartInlineTaskKeybinding)
    setEnableChatAutocomplete(message.settings.enableChatAutocomplete)
  })

  onCleanup(unsubscribe)

  vscode.postMessage({ type: "requestAutocompleteSettings" })

  const updateSetting = (
    key: "enableAutoTrigger" | "enableSmartInlineTaskKeybinding" | "enableChatAutocomplete",
    value: boolean,
  ) => {
    vscode.postMessage({ type: "updateAutocompleteSetting", key, value })
  }

  return (
    <div data-component="autocomplete-settings" style={{ display: "flex", "flex-direction": "column", gap: "16px" }}>
      <SettingsRow
        title="Enable automatic inline completions"
        description="Automatically show inline completion suggestions as you type"
      >
        <Switch checked={enableAutoTrigger()} onChange={(checked) => updateSetting("enableAutoTrigger", checked)} hideLabel>
          Enable automatic inline completions
        </Switch>
      </SettingsRow>

      <SettingsRow
        title="Enable smart inline task keybinding"
        description="Use a smart keybinding for triggering inline tasks"
      >
        <Switch
          checked={enableSmartInlineTaskKeybinding()}
          onChange={(checked) => updateSetting("enableSmartInlineTaskKeybinding", checked)}
          hideLabel
        >
          Enable smart inline task keybinding
        </Switch>
      </SettingsRow>

      <SettingsRow
        title="Enable chat textarea autocomplete"
        description="Show autocomplete suggestions in the chat textarea"
      >
        <Switch
          checked={enableChatAutocomplete()}
          onChange={(checked) => updateSetting("enableChatAutocomplete", checked)}
          hideLabel
        >
          Enable chat textarea autocomplete
        </Switch>
      </SettingsRow>
    </div>
  )
}

export default AutocompleteTab
