import { Component, createSignal, For } from "solid-js";

type SubtabId = "modes" | "mcpServers" | "rules" | "workflows" | "skills";

interface SubtabConfig {
  id: SubtabId;
  label: string;
}

const subtabs: SubtabConfig[] = [
  { id: "modes", label: "Modes" },
  { id: "mcpServers", label: "MCP Servers" },
  { id: "rules", label: "Rules" },
  { id: "workflows", label: "Workflows" },
  { id: "skills", label: "Skills" },
];

const AgentBehaviourTab: Component = () => {
  const [activeSubtab, setActiveSubtab] = createSignal<SubtabId>("modes");

  const renderSubtabContent = () => {
    return (
      <div style={{
        background: "var(--vscode-editor-background)",
        border: "1px solid var(--vscode-panel-border)",
        "border-radius": "4px",
        padding: "16px",
      }}>
        <p style={{
          "font-size": "12px",
          color: "var(--vscode-descriptionForeground)",
          margin: 0,
          "line-height": "1.5",
        }}>
          <strong style={{ color: "var(--vscode-foreground)" }}>This section is not implemented yet.</strong>
          {" "}It will contain configuration options for {activeSubtab()}.
          During reimplementation, use this space to validate layout, spacing, scrolling behavior, and navigation state
          before wiring up real controls.
        </p>
      </div>
    );
  };

  return (
    <div>
      {/* Horizontal subtab bar */}
      <div style={{
        display: "flex",
        gap: "0",
        "border-bottom": "1px solid var(--vscode-panel-border)",
        "margin-bottom": "16px",
      }}>
        <For each={subtabs}>
          {(subtab) => (
            <button
              onClick={() => setActiveSubtab(subtab.id)}
              style={{
                padding: "8px 16px",
                border: "none",
                background: "transparent",
                color: activeSubtab() === subtab.id
                  ? "var(--vscode-foreground)"
                  : "var(--vscode-descriptionForeground)",
                "font-size": "13px",
                "font-family": "var(--vscode-font-family)",
                cursor: "pointer",
                "border-bottom": activeSubtab() === subtab.id
                  ? "2px solid var(--vscode-foreground)"
                  : "2px solid transparent",
                "margin-bottom": "-1px",
              }}
              onMouseEnter={(e) => {
                if (activeSubtab() !== subtab.id) {
                  e.currentTarget.style.color = "var(--vscode-foreground)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeSubtab() !== subtab.id) {
                  e.currentTarget.style.color = "var(--vscode-descriptionForeground)";
                }
              }}
            >
              {subtab.label}
            </button>
          )}
        </For>
      </div>

      {/* Subtab content */}
      {renderSubtabContent()}
    </div>
  );
};

export default AgentBehaviourTab;
