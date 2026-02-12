import { Component, createSignal, createMemo, For, Show } from "solid-js"
import { useConfig } from "../../context/config"
import { useSession } from "../../context/session"
import { useLanguage } from "../../context/language"
import type { AgentConfig } from "../../types/messages"

type SubtabId = "agents" | "mcpServers" | "rules" | "workflows" | "skills"

interface SubtabConfig {
  id: SubtabId
  labelKey: string
}

const subtabs: SubtabConfig[] = [
  { id: "agents", labelKey: "settings.agentBehaviour.subtab.agents" },
  { id: "mcpServers", labelKey: "settings.agentBehaviour.subtab.mcpServers" },
  { id: "rules", labelKey: "settings.agentBehaviour.subtab.rules" },
  { id: "workflows", labelKey: "settings.agentBehaviour.subtab.workflows" },
  { id: "skills", labelKey: "settings.agentBehaviour.subtab.skills" },
]

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

const inputStyle = {
  padding: "4px 8px",
  "border-radius": "4px",
  border: "1px solid var(--vscode-input-border, var(--vscode-panel-border))",
  background: "var(--vscode-input-background)",
  color: "var(--vscode-input-foreground)",
  "font-size": "12px",
  "font-family": "var(--vscode-font-family)",
  outline: "none",
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

const Placeholder: Component<{ text: string }> = (props) => (
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
      <strong style={{ color: "var(--vscode-foreground)" }}>Not yet implemented.</strong> {props.text}
    </p>
  </div>
)

const AgentBehaviourTab: Component = () => {
  const language = useLanguage()
  const { config, updateConfig } = useConfig()
  const session = useSession()
  const [activeSubtab, setActiveSubtab] = createSignal<SubtabId>("agents")
  const [selectedAgent, setSelectedAgent] = createSignal<string>("")
  const [newSkillPath, setNewSkillPath] = createSignal("")
  const [newSkillUrl, setNewSkillUrl] = createSignal("")
  const [newInstruction, setNewInstruction] = createSignal("")

  const agentNames = createMemo(() => {
    const names = session.agents().map((a) => a.name)
    // Also include any agents from config that might not be in the agent list
    const configAgents = Object.keys(config().agent ?? {})
    for (const name of configAgents) {
      if (!names.includes(name)) {
        names.push(name)
      }
    }
    return names.sort()
  })

  const currentAgentConfig = createMemo<AgentConfig>(() => {
    const name = selectedAgent()
    if (!name) {
      return {}
    }
    return config().agent?.[name] ?? {}
  })

  const updateAgentConfig = (name: string, partial: Partial<AgentConfig>) => {
    const existing = config().agent ?? {}
    const current = existing[name] ?? {}
    updateConfig({
      agent: {
        ...existing,
        [name]: { ...current, ...partial },
      },
    })
  }

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

  const skillPaths = () => config().skills?.paths ?? []
  const skillUrls = () => config().skills?.urls ?? []

  const addSkillPath = () => {
    const value = newSkillPath().trim()
    if (!value) {
      return
    }
    const current = [...skillPaths()]
    if (!current.includes(value)) {
      current.push(value)
      updateConfig({ skills: { ...config().skills, paths: current } })
    }
    setNewSkillPath("")
  }

  const removeSkillPath = (index: number) => {
    const current = [...skillPaths()]
    current.splice(index, 1)
    updateConfig({ skills: { ...config().skills, paths: current } })
  }

  const addSkillUrl = () => {
    const value = newSkillUrl().trim()
    if (!value) {
      return
    }
    const current = [...skillUrls()]
    if (!current.includes(value)) {
      current.push(value)
      updateConfig({ skills: { ...config().skills, urls: current } })
    }
    setNewSkillUrl("")
  }

  const removeSkillUrl = (index: number) => {
    const current = [...skillUrls()]
    current.splice(index, 1)
    updateConfig({ skills: { ...config().skills, urls: current } })
  }

  const renderAgentsSubtab = () => (
    <div>
      {/* Default agent */}
      <div
        style={{
          border: "1px solid var(--vscode-panel-border)",
          "border-radius": "4px",
          overflow: "hidden",
          "margin-bottom": "12px",
        }}
      >
        <SettingRow label="Default Agent" description="Agent to use when none is specified" last>
          <select
            style={selectStyle}
            value={config().default_agent ?? ""}
            onChange={(e) => updateConfig({ default_agent: e.currentTarget.value || undefined })}
          >
            <option value="">Default</option>
            <For each={agentNames()}>{(name) => <option value={name}>{name}</option>}</For>
          </select>
        </SettingRow>
      </div>

      {/* Agent selector */}
      <div style={{ "margin-bottom": "12px" }}>
        <select
          style={{ ...selectStyle, width: "100%" }}
          value={selectedAgent()}
          onChange={(e) => setSelectedAgent(e.currentTarget.value)}
        >
          <option value="">Select an agent to configure…</option>
          <For each={agentNames()}>{(name) => <option value={name}>{name}</option>}</For>
        </select>
      </div>

      <Show when={selectedAgent()}>
        <div
          style={{
            border: "1px solid var(--vscode-panel-border)",
            "border-radius": "4px",
            overflow: "hidden",
          }}
        >
          {/* Model override */}
          <SettingRow label="Model Override" description="Override the default model for this agent">
            <input
              type="text"
              style={{ ...inputStyle, width: "200px" }}
              value={currentAgentConfig().model ?? ""}
              placeholder="e.g. anthropic/claude-sonnet-4-20250514"
              onBlur={(e) =>
                updateAgentConfig(selectedAgent(), {
                  model: e.currentTarget.value.trim() || undefined,
                })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur()
                }
              }}
            />
          </SettingRow>

          {/* System prompt */}
          <SettingRow label="Custom Prompt" description="Additional system prompt for this agent">
            <textarea
              style={{
                ...inputStyle,
                width: "200px",
                height: "60px",
                resize: "vertical",
              }}
              value={currentAgentConfig().prompt ?? ""}
              placeholder="Custom instructions…"
              onBlur={(e) =>
                updateAgentConfig(selectedAgent(), {
                  prompt: e.currentTarget.value.trim() || undefined,
                })
              }
            />
          </SettingRow>

          {/* Temperature */}
          <SettingRow label="Temperature" description="Sampling temperature (0-2)">
            <input
              type="number"
              style={{ ...inputStyle, width: "80px" }}
              value={currentAgentConfig().temperature ?? ""}
              placeholder="Default"
              min="0"
              max="2"
              step="0.1"
              onChange={(e) => {
                const val = parseFloat(e.currentTarget.value)
                updateAgentConfig(selectedAgent(), { temperature: isNaN(val) ? undefined : val })
              }}
            />
          </SettingRow>

          {/* Top-p */}
          <SettingRow label="Top P" description="Nucleus sampling parameter (0-1)">
            <input
              type="number"
              style={{ ...inputStyle, width: "80px" }}
              value={currentAgentConfig().top_p ?? ""}
              placeholder="Default"
              min="0"
              max="1"
              step="0.05"
              onChange={(e) => {
                const val = parseFloat(e.currentTarget.value)
                updateAgentConfig(selectedAgent(), { top_p: isNaN(val) ? undefined : val })
              }}
            />
          </SettingRow>

          {/* Max steps */}
          <SettingRow label="Max Steps" description="Maximum agentic iterations" last>
            <input
              type="number"
              style={{ ...inputStyle, width: "80px" }}
              value={currentAgentConfig().steps ?? ""}
              placeholder="Default"
              min="1"
              onChange={(e) => {
                const val = parseInt(e.currentTarget.value, 10)
                updateAgentConfig(selectedAgent(), { steps: isNaN(val) ? undefined : val })
              }}
            />
          </SettingRow>
        </div>
      </Show>
    </div>
  )

  const renderMcpSubtab = () => {
    const mcpEntries = createMemo(() => Object.entries(config().mcp ?? {}))

    return (
      <div>
        <Show
          when={mcpEntries().length > 0}
          fallback={
            <div
              style={{
                padding: "16px",
                background: "var(--vscode-editor-background)",
                border: "1px solid var(--vscode-panel-border)",
                "border-radius": "4px",
                "font-size": "12px",
                color: "var(--vscode-descriptionForeground)",
              }}
            >
              No MCP servers configured. Edit the opencode config file to add MCP servers.
            </div>
          }
        >
          <div
            style={{
              border: "1px solid var(--vscode-panel-border)",
              "border-radius": "4px",
              overflow: "hidden",
            }}
          >
            <For each={mcpEntries()}>
              {([name, mcp], index) => (
                <div
                  style={{
                    padding: "10px 12px",
                    background: "var(--vscode-editor-background)",
                    "border-bottom":
                      index() < mcpEntries().length - 1 ? "1px solid var(--vscode-panel-border)" : "none",
                  }}
                >
                  <div
                    style={{
                      "font-size": "12px",
                      "font-weight": "500",
                      color: "var(--vscode-foreground)",
                    }}
                  >
                    {name}
                  </div>
                  <div
                    style={{
                      "font-size": "11px",
                      color: "var(--vscode-descriptionForeground)",
                      "margin-top": "4px",
                      "font-family": "var(--vscode-editor-font-family, monospace)",
                    }}
                  >
                    <Show when={mcp.command}>
                      <div>
                        command: {mcp.command} {(mcp.args ?? []).join(" ")}
                      </div>
                    </Show>
                    <Show when={mcp.url}>
                      <div>url: {mcp.url}</div>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    )
  }

  const renderSkillsSubtab = () => (
    <div>
      {/* Skill paths */}
      <h4
        style={{
          "font-size": "13px",
          "margin-top": "0",
          "margin-bottom": "8px",
          color: "var(--vscode-foreground)",
        }}
      >
        Skill Folder Paths
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
            display: "flex",
            gap: "8px",
            padding: "8px 12px",
            background: "var(--vscode-editor-background)",
            "border-bottom": skillPaths().length > 0 ? "1px solid var(--vscode-panel-border)" : "none",
          }}
        >
          <input
            type="text"
            style={{ ...inputStyle, flex: "1" }}
            value={newSkillPath()}
            placeholder="e.g. ./skills"
            onInput={(e) => setNewSkillPath(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addSkillPath()
              }
            }}
          />
          <button
            onClick={addSkillPath}
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
        <For each={skillPaths()}>
          {(path, index) => (
            <div
              style={{
                display: "flex",
                "align-items": "center",
                "justify-content": "space-between",
                padding: "6px 12px",
                background: "var(--vscode-editor-background)",
                "border-bottom": index() < skillPaths().length - 1 ? "1px solid var(--vscode-panel-border)" : "none",
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
                onClick={() => removeSkillPath(index())}
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

      {/* Skill URLs */}
      <h4
        style={{
          "font-size": "13px",
          "margin-top": "0",
          "margin-bottom": "8px",
          color: "var(--vscode-foreground)",
        }}
      >
        Skill URLs
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
            display: "flex",
            gap: "8px",
            padding: "8px 12px",
            background: "var(--vscode-editor-background)",
            "border-bottom": skillUrls().length > 0 ? "1px solid var(--vscode-panel-border)" : "none",
          }}
        >
          <input
            type="text"
            style={{ ...inputStyle, flex: "1" }}
            value={newSkillUrl()}
            placeholder="e.g. https://example.com/skills"
            onInput={(e) => setNewSkillUrl(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addSkillUrl()
              }
            }}
          />
          <button
            onClick={addSkillUrl}
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
        <For each={skillUrls()}>
          {(url, index) => (
            <div
              style={{
                display: "flex",
                "align-items": "center",
                "justify-content": "space-between",
                padding: "6px 12px",
                background: "var(--vscode-editor-background)",
                "border-bottom": index() < skillUrls().length - 1 ? "1px solid var(--vscode-panel-border)" : "none",
              }}
            >
              <span
                style={{
                  "font-size": "12px",
                  "font-family": "var(--vscode-editor-font-family, monospace)",
                  color: "var(--vscode-foreground)",
                }}
              >
                {url}
              </span>
              <button
                onClick={() => removeSkillUrl(index())}
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

  const renderRulesSubtab = () => (
    <div>
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
            style={{ ...inputStyle, flex: "1" }}
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

  const renderSubtabContent = () => {
    switch (activeSubtab()) {
      case "agents":
        return renderAgentsSubtab()
      case "mcpServers":
        return renderMcpSubtab()
      case "rules":
        return renderRulesSubtab()
      case "workflows":
        return <Placeholder text="Workflows are managed via workflow files in your workspace." />
      case "skills":
        return renderSkillsSubtab()
      default:
        return null
    }
  }

  return (
    <div>
      {/* Horizontal subtab bar */}
      <div
        style={{
          display: "flex",
          gap: "0",
          "border-bottom": "1px solid var(--vscode-panel-border)",
          "margin-bottom": "16px",
        }}
      >
        <For each={subtabs}>
          {(subtab) => (
            <button
              onClick={() => setActiveSubtab(subtab.id)}
              style={{
                padding: "8px 16px",
                border: "none",
                background: "transparent",
                color:
                  activeSubtab() === subtab.id ? "var(--vscode-foreground)" : "var(--vscode-descriptionForeground)",
                "font-size": "13px",
                "font-family": "var(--vscode-font-family)",
                cursor: "pointer",
                "border-bottom":
                  activeSubtab() === subtab.id ? "2px solid var(--vscode-foreground)" : "2px solid transparent",
                "margin-bottom": "-1px",
              }}
              onMouseEnter={(e) => {
                if (activeSubtab() !== subtab.id) {
                  e.currentTarget.style.color = "var(--vscode-foreground)"
                }
              }}
              onMouseLeave={(e) => {
                if (activeSubtab() !== subtab.id) {
                  e.currentTarget.style.color = "var(--vscode-descriptionForeground)"
                }
              }}
            >
              {language.t(subtab.labelKey)}
            </button>
          )}
        </For>
      </div>

      {/* Subtab content */}
      {renderSubtabContent()}
    </div>
  )
}

export default AgentBehaviourTab
