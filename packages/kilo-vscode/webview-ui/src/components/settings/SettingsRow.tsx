// kilocode_change - new file
import { Component } from "solid-js"

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

export default SettingsRow
