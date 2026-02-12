import { Component, For, createMemo } from "solid-js"
import { useConfig } from "../../context/config"
import type { PermissionLevel } from "../../types/messages"

const TOOLS = [
  "read",
  "edit",
  "glob",
  "grep",
  "list",
  "bash",
  "task",
  "skill",
  "lsp",
  "todoread",
  "todowrite",
  "webfetch",
  "websearch",
  "codesearch",
  "external_directory",
  "doom_loop",
] as const

const LEVELS: PermissionLevel[] = ["allow", "ask", "deny"]

const TOOL_DESCRIPTIONS: Record<string, string> = {
  read: "Read file contents",
  edit: "Edit or create files",
  glob: "Find files by pattern",
  grep: "Search file contents",
  list: "List directory contents",
  bash: "Execute shell commands",
  task: "Create sub-agent tasks",
  skill: "Execute skills",
  lsp: "Language server operations",
  todoread: "Read todo lists",
  todowrite: "Write todo lists",
  webfetch: "Fetch web pages",
  websearch: "Search the web",
  codesearch: "Search codebase",
  external_directory: "Access files outside workspace",
  doom_loop: "Continue after repeated failures",
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
  "min-width": "80px",
}

const AutoApproveTab: Component = () => {
  const { config, updateConfig } = useConfig()

  const permissions = createMemo(() => config().permission ?? {})

  const getLevel = (tool: string): PermissionLevel => {
    return permissions()[tool] ?? permissions()["*"] ?? "ask"
  }

  const setPermission = (tool: string, level: PermissionLevel) => {
    updateConfig({
      permission: { ...permissions(), [tool]: level },
    })
  }

  const setAll = (level: PermissionLevel) => {
    const updated: Record<string, PermissionLevel> = {}
    for (const tool of TOOLS) {
      updated[tool] = level
    }
    updateConfig({ permission: updated })
  }

  return (
    <div>
      {/* Set All control */}
      <div
        style={{
          display: "flex",
          "align-items": "center",
          "justify-content": "space-between",
          padding: "8px 12px",
          "margin-bottom": "8px",
          background: "var(--vscode-editor-background)",
          border: "1px solid var(--vscode-panel-border)",
          "border-radius": "4px",
        }}
      >
        <span style={{ "font-size": "12px", "font-weight": "600", color: "var(--vscode-foreground)" }}>
          Set all permissions
        </span>
        <select
          style={selectStyle}
          onChange={(e) => {
            const value = e.currentTarget.value as PermissionLevel
            if (value) {
              setAll(value)
            }
          }}
          value=""
        >
          <option value="" disabled>
            Choose…
          </option>
          <For each={LEVELS}>
            {(level) => <option value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>}
          </For>
        </select>
      </div>

      {/* Tool permission list */}
      <div
        style={{
          border: "1px solid var(--vscode-panel-border)",
          "border-radius": "4px",
          overflow: "hidden",
        }}
      >
        <For each={[...TOOLS]}>
          {(tool, index) => (
            <div
              style={{
                display: "flex",
                "align-items": "center",
                "justify-content": "space-between",
                padding: "8px 12px",
                background:
                  index() % 2 === 0
                    ? "var(--vscode-editor-background)"
                    : "var(--vscode-sideBar-background, var(--vscode-editor-background))",
                "border-bottom": index() < TOOLS.length - 1 ? "1px solid var(--vscode-panel-border)" : "none",
              }}
            >
              <div style={{ flex: 1, "min-width": 0 }}>
                <div
                  style={{
                    "font-size": "12px",
                    "font-weight": "500",
                    color: "var(--vscode-foreground)",
                    "font-family": "var(--vscode-editor-font-family, monospace)",
                  }}
                >
                  {tool}
                </div>
                <div
                  style={{
                    "font-size": "11px",
                    color: "var(--vscode-descriptionForeground)",
                    "margin-top": "2px",
                  }}
                >
                  {TOOL_DESCRIPTIONS[tool] ?? tool}
                </div>
              </div>
              <select
                style={selectStyle}
                value={getLevel(tool)}
                onChange={(e) => setPermission(tool, e.currentTarget.value as PermissionLevel)}
              >
                <For each={LEVELS}>
                  {(level) => <option value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>}
                </For>
              </select>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}

export default AutoApproveTab
