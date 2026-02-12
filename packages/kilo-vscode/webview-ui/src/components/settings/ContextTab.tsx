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

const ContextTab: Component = () => {
  const { config, updateConfig } = useConfig()
  const [newPattern, setNewPattern] = createSignal("")

  const patterns = () => config().watcher?.ignore ?? []

  const addPattern = () => {
    const value = newPattern().trim()
    if (!value) {
      return
    }
    const current = [...patterns()]
    if (!current.includes(value)) {
      current.push(value)
      updateConfig({ watcher: { ignore: current } })
    }
    setNewPattern("")
  }

  const removePattern = (index: number) => {
    const current = [...patterns()]
    current.splice(index, 1)
    updateConfig({ watcher: { ignore: current } })
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
        {/* Header */}
        <div
          style={{
            padding: "10px 12px",
            background: "var(--vscode-editor-background)",
            "border-bottom": "1px solid var(--vscode-panel-border)",
          }}
        >
          <div
            style={{
              "font-size": "12px",
              "font-weight": "500",
              color: "var(--vscode-foreground)",
            }}
          >
            File Watcher Ignore Patterns
          </div>
          <div
            style={{
              "font-size": "11px",
              color: "var(--vscode-descriptionForeground)",
              "margin-top": "2px",
            }}
          >
            Glob patterns for files the watcher should ignore
          </div>
        </div>

        {/* Add new pattern */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            padding: "8px 12px",
            background: "var(--vscode-editor-background)",
            "border-bottom": patterns().length > 0 ? "1px solid var(--vscode-panel-border)" : "none",
          }}
        >
          <input
            type="text"
            style={inputStyle}
            value={newPattern()}
            placeholder="e.g. **/node_modules/**"
            onInput={(e) => setNewPattern(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addPattern()
              }
            }}
          />
          <button
            onClick={addPattern}
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

        {/* Pattern list */}
        <For each={patterns()}>
          {(pattern, index) => (
            <div
              style={{
                display: "flex",
                "align-items": "center",
                "justify-content": "space-between",
                padding: "6px 12px",
                background: "var(--vscode-editor-background)",
                "border-bottom": index() < patterns().length - 1 ? "1px solid var(--vscode-panel-border)" : "none",
              }}
            >
              <span
                style={{
                  "font-size": "12px",
                  "font-family": "var(--vscode-editor-font-family, monospace)",
                  color: "var(--vscode-foreground)",
                }}
              >
                {pattern}
              </span>
              <button
                onClick={() => removePattern(index())}
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

export default ContextTab
