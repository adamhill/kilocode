import { Component, For, Show, createMemo } from "solid-js"
import { useConfig } from "../../context/config"

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

const inputStyle = {
  padding: "4px 8px",
  "border-radius": "4px",
  border: "1px solid var(--vscode-input-border, var(--vscode-panel-border))",
  background: "var(--vscode-input-background)",
  color: "var(--vscode-input-foreground)",
  "font-size": "12px",
  "font-family": "var(--vscode-font-family)",
  outline: "none",
  width: "100px",
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

const ExperimentalTab: Component = () => {
  const { config, updateConfig } = useConfig()

  const experimental = createMemo(() => config().experimental ?? {})

  const updateExperimental = (key: string, value: unknown) => {
    updateConfig({
      experimental: { ...experimental(), [key]: value },
    })
  }

  return (
    <div>
      <div
        style={{
          border: "1px solid var(--vscode-panel-border)",
          "border-radius": "4px",
          overflow: "hidden",
        }}
      >
        {/* Share mode */}
        <SettingRow label="Share Mode" description="How session sharing behaves">
          <select
            style={selectStyle}
            value={config().share ?? "manual"}
            onChange={(e) => updateConfig({ share: e.currentTarget.value as "manual" | "auto" | "disabled" })}
          >
            <option value="manual">Manual</option>
            <option value="auto">Auto</option>
            <option value="disabled">Disabled</option>
          </select>
        </SettingRow>

        {/* Formatter */}
        <SettingRow label="Formatter" description="Enable the automatic code formatter">
          <label style={{ display: "flex", "align-items": "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={config().formatter !== false}
              onChange={(e) => updateConfig({ formatter: e.currentTarget.checked ? {} : false })}
              style={{ cursor: "pointer" }}
            />
          </label>
        </SettingRow>

        {/* LSP */}
        <SettingRow label="LSP" description="Enable language server protocol integration">
          <label style={{ display: "flex", "align-items": "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={config().lsp !== false}
              onChange={(e) => updateConfig({ lsp: e.currentTarget.checked ? {} : false })}
              style={{ cursor: "pointer" }}
            />
          </label>
        </SettingRow>

        {/* Disable paste summary */}
        <SettingRow label="Disable Paste Summary" description="Don't summarize large pasted content">
          <label style={{ display: "flex", "align-items": "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={experimental().disable_paste_summary ?? false}
              onChange={(e) => updateExperimental("disable_paste_summary", e.currentTarget.checked)}
              style={{ cursor: "pointer" }}
            />
          </label>
        </SettingRow>

        {/* Batch tool */}
        <SettingRow label="Batch Tool" description="Enable batching of multiple tool calls">
          <label style={{ display: "flex", "align-items": "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={experimental().batch_tool ?? false}
              onChange={(e) => updateExperimental("batch_tool", e.currentTarget.checked)}
              style={{ cursor: "pointer" }}
            />
          </label>
        </SettingRow>

        {/* Continue loop on deny */}
        <SettingRow label="Continue on Deny" description="Continue the agent loop when a permission is denied">
          <label style={{ display: "flex", "align-items": "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={experimental().continue_loop_on_deny ?? false}
              onChange={(e) => updateExperimental("continue_loop_on_deny", e.currentTarget.checked)}
              style={{ cursor: "pointer" }}
            />
          </label>
        </SettingRow>

        {/* MCP timeout */}
        <SettingRow label="MCP Timeout (ms)" description="Timeout for MCP server requests in milliseconds" last>
          <input
            type="number"
            style={inputStyle}
            value={experimental().mcp_timeout ?? 60000}
            onChange={(e) => {
              const value = parseInt(e.currentTarget.value, 10)
              if (!isNaN(value) && value > 0) {
                updateExperimental("mcp_timeout", value)
              }
            }}
          />
        </SettingRow>
      </div>

      {/* Tool toggles */}
      <Show when={config().tools && Object.keys(config().tools ?? {}).length > 0}>
        <h4
          style={{
            "font-size": "13px",
            "margin-top": "16px",
            "margin-bottom": "8px",
            color: "var(--vscode-foreground)",
          }}
        >
          Tool Toggles
        </h4>
        <div
          style={{
            border: "1px solid var(--vscode-panel-border)",
            "border-radius": "4px",
            overflow: "hidden",
          }}
        >
          <For each={Object.entries(config().tools ?? {})}>
            {([name, enabled], index) => (
              <div
                style={{
                  display: "flex",
                  "align-items": "center",
                  "justify-content": "space-between",
                  padding: "8px 12px",
                  background: "var(--vscode-editor-background)",
                  "border-bottom":
                    index() < Object.keys(config().tools ?? {}).length - 1
                      ? "1px solid var(--vscode-panel-border)"
                      : "none",
                }}
              >
                <span
                  style={{
                    "font-size": "12px",
                    "font-family": "var(--vscode-editor-font-family, monospace)",
                    color: "var(--vscode-foreground)",
                  }}
                >
                  {name}
                </span>
                <label style={{ display: "flex", "align-items": "center", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => {
                      updateConfig({
                        tools: { ...config().tools, [name]: e.currentTarget.checked },
                      })
                    }}
                    style={{ cursor: "pointer" }}
                  />
                </label>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

export default ExperimentalTab
