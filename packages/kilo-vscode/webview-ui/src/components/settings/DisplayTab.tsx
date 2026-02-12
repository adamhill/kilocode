import { Component } from "solid-js"
import { useConfig } from "../../context/config"

const inputStyle = {
  padding: "4px 8px",
  "border-radius": "4px",
  border: "1px solid var(--vscode-input-border, var(--vscode-panel-border))",
  background: "var(--vscode-input-background)",
  color: "var(--vscode-input-foreground)",
  "font-size": "12px",
  "font-family": "var(--vscode-font-family)",
  outline: "none",
  width: "200px",
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
  "min-width": "120px",
}

const DisplayTab: Component = () => {
  const { config, updateConfig } = useConfig()

  return (
    <div>
      <div
        style={{
          border: "1px solid var(--vscode-panel-border)",
          "border-radius": "4px",
          overflow: "hidden",
        }}
      >
        {/* Username */}
        <div
          style={{
            display: "flex",
            "align-items": "center",
            "justify-content": "space-between",
            padding: "10px 12px",
            background: "var(--vscode-editor-background)",
            "border-bottom": "1px solid var(--vscode-panel-border)",
          }}
        >
          <div>
            <div
              style={{
                "font-size": "12px",
                "font-weight": "500",
                color: "var(--vscode-foreground)",
              }}
            >
              Username
            </div>
            <div
              style={{
                "font-size": "11px",
                color: "var(--vscode-descriptionForeground)",
                "margin-top": "2px",
              }}
            >
              Custom username displayed in conversations
            </div>
          </div>
          <input
            type="text"
            style={inputStyle}
            value={config().username ?? ""}
            placeholder="User"
            onBlur={(e) => {
              const value = e.currentTarget.value.trim()
              updateConfig({ username: value || undefined })
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur()
              }
            }}
          />
        </div>

        {/* Layout mode */}
        <div
          style={{
            display: "flex",
            "align-items": "center",
            "justify-content": "space-between",
            padding: "10px 12px",
            background: "var(--vscode-editor-background)",
          }}
        >
          <div>
            <div
              style={{
                "font-size": "12px",
                "font-weight": "500",
                color: "var(--vscode-foreground)",
              }}
            >
              Layout
            </div>
            <div
              style={{
                "font-size": "11px",
                color: "var(--vscode-descriptionForeground)",
                "margin-top": "2px",
              }}
            >
              Layout mode for the chat interface
            </div>
          </div>
          <select
            style={selectStyle}
            value={config().layout ?? "auto"}
            onChange={(e) => updateConfig({ layout: e.currentTarget.value as "auto" | "stretch" })}
          >
            <option value="auto">Auto</option>
            <option value="stretch">Stretch</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export default DisplayTab
