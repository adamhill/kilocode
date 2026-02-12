import { Component } from "solid-js"

const PromptsTab: Component = () => {
  return (
    <div>
      <div
        style={{
          background: "var(--vscode-editor-background)",
          border: "1px solid var(--vscode-panel-border)",
          "border-radius": "4px",
          padding: "16px",
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
          Instruction file settings have been moved to{" "}
          <strong style={{ color: "var(--vscode-foreground)" }}>Agent Behaviour → Rules</strong>.
        </p>
      </div>
    </div>
  )
}

export default PromptsTab
