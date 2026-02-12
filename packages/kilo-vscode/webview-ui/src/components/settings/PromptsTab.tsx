import { Component, For, createSignal } from "solid-js"
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
  flex: "1",
}

const PromptsTab: Component = () => {
  const { config, updateConfig } = useConfig()
  const [newInstruction, setNewInstruction] = createSignal("")

  const instructions = () => config().instructions ?? []

  const addInstruction = () => {
    const value = newInstruction().trim()
    if (!value) {
      return
    }
    const current = [...instructions()]
    if (!current.includes(value)) {
      current.push(value)
      updateConfig({ instructions: current })
    }
    setNewInstruction("")
  }

  const removeInstruction = (index: number) => {
    const current = [...instructions()]
    current.splice(index, 1)
    updateConfig({ instructions: current })
  }

  return (
    <div>
      {/* Instructions file paths */}
      <div
        style={{
          border: "1px solid var(--vscode-panel-border)",
          "border-radius": "4px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "10px 12px",
            background: "var(--vscode-editor-background)",
            "border-bottom": "1px solid var(--vscode-panel-border)",
          }}
        >
          <div style={{ "font-size": "12px", "font-weight": "500", color: "var(--vscode-foreground)" }}>
            Additional Instruction Files
          </div>
          <div
            style={{
              "font-size": "11px",
              color: "var(--vscode-descriptionForeground)",
              "margin-top": "2px",
            }}
          >
            Paths to additional instruction files that are included in the system prompt
          </div>
        </div>

        {/* Add new instruction path */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            padding: "8px 12px",
            background: "var(--vscode-editor-background)",
            "border-bottom": instructions().length > 0 ? "1px solid var(--vscode-panel-border)" : "none",
          }}
        >
          <input
            type="text"
            style={inputStyle}
            value={newInstruction()}
            placeholder="e.g. ./INSTRUCTIONS.md"
            onInput={(e) => setNewInstruction(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addInstruction()
              }
            }}
          />
          <button
            onClick={addInstruction}
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

        {/* Instructions list */}
        <For each={instructions()}>
          {(path, index) => (
            <div
              style={{
                display: "flex",
                "align-items": "center",
                "justify-content": "space-between",
                padding: "6px 12px",
                background: "var(--vscode-editor-background)",
                "border-bottom": index() < instructions().length - 1 ? "1px solid var(--vscode-panel-border)" : "none",
              }}
            >
              <span
                style={{
                  "font-size": "12px",
                  "font-family": "var(--vscode-editor-font-family, monospace)",
                  color: "var(--vscode-foreground)",
                }}
              >
                {path}
              </span>
              <button
                onClick={() => removeInstruction(index())}
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

export default PromptsTab
