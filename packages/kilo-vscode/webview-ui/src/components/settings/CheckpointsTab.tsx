import { Component } from "solid-js"
import { useConfig } from "../../context/config"

const CheckpointsTab: Component = () => {
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
        {/* Snapshot toggle */}
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
              Enable Snapshots
            </div>
            <div
              style={{
                "font-size": "11px",
                color: "var(--vscode-descriptionForeground)",
                "margin-top": "2px",
              }}
            >
              Create checkpoints before file edits so you can restore previous states
            </div>
          </div>
          <label style={{ display: "flex", "align-items": "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={config().snapshot !== false}
              onChange={(e) => updateConfig({ snapshot: e.currentTarget.checked })}
              style={{ cursor: "pointer" }}
            />
          </label>
        </div>
      </div>
    </div>
  )
}

export default CheckpointsTab
