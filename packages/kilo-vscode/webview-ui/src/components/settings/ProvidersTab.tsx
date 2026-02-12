import { Component, For, Show, createSignal, createMemo } from "solid-js"
import { useConfig } from "../../context/config"
import { useProvider } from "../../context/provider"

const inputStyle = {
  padding: "4px 8px",
  "border-radius": "4px",
  border: "1px solid var(--vscode-input-border, var(--vscode-panel-border))",
  background: "var(--vscode-input-background)",
  color: "var(--vscode-input-foreground)",
  "font-size": "12px",
  "font-family": "var(--vscode-font-family)",
  outline: "none",
  width: "240px",
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
  width: "260px",
}

interface SettingRowProps {
  label: string
  description: string
  last?: boolean
  children: any
}

const SettingRow: Component<SettingRowProps> = (props) => (
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
      <div style={{ "font-size": "12px", "font-weight": "500", color: "var(--vscode-foreground)" }}>{props.label}</div>
      <div style={{ "font-size": "11px", color: "var(--vscode-descriptionForeground)", "margin-top": "2px" }}>
        {props.description}
      </div>
    </div>
    {props.children}
  </div>
)

const ProvidersTab: Component = () => {
  const { config, updateConfig } = useConfig()
  const provider = useProvider()

  // Build a flat list of available model IDs (provider/model format) from the provider catalog
  const modelOptions = createMemo(() => {
    const options: string[] = []
    const provs = provider.providers()
    for (const provId of Object.keys(provs)) {
      for (const modelId of Object.keys(provs[provId].models)) {
        options.push(`${provId}/${modelId}`)
      }
    }
    return options.sort()
  })

  // Provider IDs from the catalog
  const providerIds = createMemo(() => Object.keys(provider.providers()).sort())

  const [newDisabled, setNewDisabled] = createSignal("")
  const [newEnabled, setNewEnabled] = createSignal("")

  const disabledProviders = () => config().disabled_providers ?? []
  const enabledProviders = () => config().enabled_providers ?? []

  const addToList = (key: "disabled_providers" | "enabled_providers", value: string) => {
    const current = key === "disabled_providers" ? [...disabledProviders()] : [...enabledProviders()]
    if (value && !current.includes(value)) {
      current.push(value)
      updateConfig({ [key]: current })
    }
  }

  const removeFromList = (key: "disabled_providers" | "enabled_providers", index: number) => {
    const current = key === "disabled_providers" ? [...disabledProviders()] : [...enabledProviders()]
    current.splice(index, 1)
    updateConfig({ [key]: current })
  }

  return (
    <div>
      {/* Model selection section */}
      <div
        style={{
          border: "1px solid var(--vscode-panel-border)",
          "border-radius": "4px",
          overflow: "hidden",
          "margin-bottom": "16px",
        }}
      >
        {/* Default model */}
        <SettingRow label="Default Model" description="Primary model for conversations (format: provider/model)">
          <Show
            when={modelOptions().length > 0}
            fallback={
              <input
                type="text"
                style={inputStyle}
                value={config().model ?? ""}
                placeholder="e.g. anthropic/claude-sonnet-4-20250514"
                onBlur={(e) => updateConfig({ model: e.currentTarget.value.trim() || undefined })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur()
                  }
                }}
              />
            }
          >
            <select
              style={selectStyle}
              value={config().model ?? ""}
              onChange={(e) => updateConfig({ model: e.currentTarget.value || undefined })}
            >
              <option value="">Not set (use server default)</option>
              <For each={modelOptions()}>{(opt) => <option value={opt}>{opt}</option>}</For>
            </select>
          </Show>
        </SettingRow>

        {/* Small model */}
        <SettingRow label="Small Model" description="Lightweight model for title generation and other quick tasks" last>
          <Show
            when={modelOptions().length > 0}
            fallback={
              <input
                type="text"
                style={inputStyle}
                value={config().small_model ?? ""}
                placeholder="e.g. anthropic/claude-haiku"
                onBlur={(e) => updateConfig({ small_model: e.currentTarget.value.trim() || undefined })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur()
                  }
                }}
              />
            }
          >
            <select
              style={selectStyle}
              value={config().small_model ?? ""}
              onChange={(e) => updateConfig({ small_model: e.currentTarget.value || undefined })}
            >
              <option value="">Not set (use server default)</option>
              <For each={modelOptions()}>{(opt) => <option value={opt}>{opt}</option>}</For>
            </select>
          </Show>
        </SettingRow>
      </div>

      {/* Disabled providers */}
      <h4
        style={{
          "font-size": "13px",
          "margin-top": "0",
          "margin-bottom": "8px",
          color: "var(--vscode-foreground)",
        }}
      >
        Disabled Providers
      </h4>
      <div
        style={{
          border: "1px solid var(--vscode-panel-border)",
          "border-radius": "4px",
          overflow: "hidden",
          "margin-bottom": "16px",
        }}
      >
        <div
          style={{
            padding: "8px 12px",
            background: "var(--vscode-editor-background)",
            "border-bottom": disabledProviders().length > 0 ? "1px solid var(--vscode-panel-border)" : "none",
            "font-size": "11px",
            color: "var(--vscode-descriptionForeground)",
          }}
        >
          Providers to hide from the provider list
        </div>
        <div
          style={{
            display: "flex",
            gap: "8px",
            padding: "8px 12px",
            background: "var(--vscode-editor-background)",
            "border-bottom": disabledProviders().length > 0 ? "1px solid var(--vscode-panel-border)" : "none",
          }}
        >
          <Show
            when={providerIds().length > 0}
            fallback={
              <input
                type="text"
                style={{ ...inputStyle, flex: "1", width: "auto" }}
                value={newDisabled()}
                placeholder="Provider ID"
                onInput={(e) => setNewDisabled(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addToList("disabled_providers", newDisabled().trim())
                    setNewDisabled("")
                  }
                }}
              />
            }
          >
            <select
              style={{ ...selectStyle, flex: "1", width: "auto" }}
              value={newDisabled()}
              onChange={(e) => setNewDisabled(e.currentTarget.value)}
            >
              <option value="">Select provider…</option>
              <For each={providerIds().filter((id) => !disabledProviders().includes(id))}>
                {(id) => <option value={id}>{id}</option>}
              </For>
            </select>
          </Show>
          <button
            onClick={() => {
              addToList("disabled_providers", newDisabled().trim())
              setNewDisabled("")
            }}
            style={{
              padding: "4px 12px",
              "border-radius": "4px",
              border: "1px solid var(--vscode-button-border, transparent)",
              background: "var(--vscode-button-background)",
              color: "var(--vscode-button-foreground)",
              "font-size": "12px",
              cursor: "pointer",
            }}
          >
            Add
          </button>
        </div>
        <For each={disabledProviders()}>
          {(id, index) => (
            <div
              style={{
                display: "flex",
                "align-items": "center",
                "justify-content": "space-between",
                padding: "6px 12px",
                background: "var(--vscode-editor-background)",
                "border-bottom":
                  index() < disabledProviders().length - 1 ? "1px solid var(--vscode-panel-border)" : "none",
              }}
            >
              <span style={{ "font-size": "12px", color: "var(--vscode-foreground)" }}>{id}</span>
              <button
                onClick={() => removeFromList("disabled_providers", index())}
                style={{
                  padding: "2px 8px",
                  "border-radius": "4px",
                  border: "1px solid var(--vscode-panel-border)",
                  background: "transparent",
                  color: "var(--vscode-descriptionForeground)",
                  "font-size": "11px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          )}
        </For>
      </div>

      {/* Enabled providers (allowlist) */}
      <h4
        style={{
          "font-size": "13px",
          "margin-top": "0",
          "margin-bottom": "8px",
          color: "var(--vscode-foreground)",
        }}
      >
        Enabled Providers (Allowlist)
      </h4>
      <div
        style={{
          border: "1px solid var(--vscode-panel-border)",
          "border-radius": "4px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "8px 12px",
            background: "var(--vscode-editor-background)",
            "border-bottom": "1px solid var(--vscode-panel-border)",
            "font-size": "11px",
            color: "var(--vscode-descriptionForeground)",
          }}
        >
          If set, only these providers will be available (exclusive allowlist)
        </div>
        <div
          style={{
            display: "flex",
            gap: "8px",
            padding: "8px 12px",
            background: "var(--vscode-editor-background)",
            "border-bottom": enabledProviders().length > 0 ? "1px solid var(--vscode-panel-border)" : "none",
          }}
        >
          <Show
            when={providerIds().length > 0}
            fallback={
              <input
                type="text"
                style={{ ...inputStyle, flex: "1", width: "auto" }}
                value={newEnabled()}
                placeholder="Provider ID"
                onInput={(e) => setNewEnabled(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addToList("enabled_providers", newEnabled().trim())
                    setNewEnabled("")
                  }
                }}
              />
            }
          >
            <select
              style={{ ...selectStyle, flex: "1", width: "auto" }}
              value={newEnabled()}
              onChange={(e) => setNewEnabled(e.currentTarget.value)}
            >
              <option value="">Select provider…</option>
              <For each={providerIds().filter((id) => !enabledProviders().includes(id))}>
                {(id) => <option value={id}>{id}</option>}
              </For>
            </select>
          </Show>
          <button
            onClick={() => {
              addToList("enabled_providers", newEnabled().trim())
              setNewEnabled("")
            }}
            style={{
              padding: "4px 12px",
              "border-radius": "4px",
              border: "1px solid var(--vscode-button-border, transparent)",
              background: "var(--vscode-button-background)",
              color: "var(--vscode-button-foreground)",
              "font-size": "12px",
              cursor: "pointer",
            }}
          >
            Add
          </button>
        </div>
        <For each={enabledProviders()}>
          {(id, index) => (
            <div
              style={{
                display: "flex",
                "align-items": "center",
                "justify-content": "space-between",
                padding: "6px 12px",
                background: "var(--vscode-editor-background)",
                "border-bottom":
                  index() < enabledProviders().length - 1 ? "1px solid var(--vscode-panel-border)" : "none",
              }}
            >
              <span style={{ "font-size": "12px", color: "var(--vscode-foreground)" }}>{id}</span>
              <button
                onClick={() => removeFromList("enabled_providers", index())}
                style={{
                  padding: "2px 8px",
                  "border-radius": "4px",
                  border: "1px solid var(--vscode-panel-border)",
                  background: "transparent",
                  color: "var(--vscode-descriptionForeground)",
                  "font-size": "11px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}

export default ProvidersTab
