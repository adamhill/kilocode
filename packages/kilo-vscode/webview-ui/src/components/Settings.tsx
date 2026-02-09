import { Component, createSignal, For } from "solid-js";
import AboutTab from "./settings/AboutTab";
import ApiKeysTab from "./settings/ApiKeysTab";
import ProvidersTab from "./settings/ProvidersTab";
import ModelsTab from "./settings/ModelsTab";
import BrowserTab from "./settings/BrowserTab";
import McpServersTab from "./settings/McpServersTab";
import RulesTab from "./settings/RulesTab";
import ModesTab from "./settings/ModesTab";
import AdvancedTab from "./settings/AdvancedTab";

export type ConnectionState = "connecting" | "connected" | "disconnected";

export interface SettingsProps {
  port: number | null;
  connectionState: ConnectionState;
}

type TabId = "about" | "apiKeys" | "providers" | "models" | "browser" | "mcpServers" | "rules" | "modes" | "advanced";

interface TabConfig {
  id: TabId;
  label: string;
}

const tabs: TabConfig[] = [
  { id: "about", label: "About" },
  { id: "apiKeys", label: "API Keys" },
  { id: "providers", label: "Providers" },
  { id: "models", label: "Models" },
  { id: "browser", label: "Browser" },
  { id: "mcpServers", label: "MCP Servers" },
  { id: "rules", label: "Rules" },
  { id: "modes", label: "Modes" },
  { id: "advanced", label: "Advanced" },
];

const Settings: Component<SettingsProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal<TabId>("about");

  const renderTabContent = () => {
    switch (activeTab()) {
      case "about":
        return <AboutTab port={props.port} connectionState={props.connectionState} />;
      case "apiKeys":
        return <ApiKeysTab />;
      case "providers":
        return <ProvidersTab />;
      case "models":
        return <ModelsTab />;
      case "browser":
        return <BrowserTab />;
      case "mcpServers":
        return <McpServersTab />;
      case "rules":
        return <RulesTab />;
      case "modes":
        return <ModesTab />;
      case "advanced":
        return <AdvancedTab />;
    }
  };

  return (
    <div style={{
      display: "flex",
      "flex-direction": "column",
      height: "100%",
      color: "var(--vscode-foreground)",
      "font-family": "var(--vscode-font-family)",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        "border-bottom": "1px solid var(--vscode-panel-border)",
        display: "flex",
        "align-items": "center",
        "justify-content": "space-between",
      }}>
        <h2 style={{
          "font-size": "16px",
          "font-weight": "600",
          margin: 0,
          color: "var(--vscode-foreground)",
        }}>
          Settings
        </h2>
      </div>

      {/* Main content area with sidebar and content */}
      <div style={{
        display: "flex",
        flex: 1,
        overflow: "hidden",
      }}>
        {/* Tab sidebar */}
        <div style={{
          width: "160px",
          "flex-shrink": 0,
          "border-right": "1px solid var(--vscode-panel-border)",
          "overflow-y": "auto",
          background: "var(--vscode-sideBar-background)",
        }}>
          <For each={tabs}>
            {(tab) => (
              <button
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  border: "none",
                  background: activeTab() === tab.id
                    ? "var(--vscode-list-activeSelectionBackground)"
                    : "transparent",
                  color: activeTab() === tab.id
                    ? "var(--vscode-list-activeSelectionForeground)"
                    : "var(--vscode-foreground)",
                  "text-align": "left",
                  cursor: "pointer",
                  "font-size": "13px",
                  "font-family": "var(--vscode-font-family)",
                  "border-left": activeTab() === tab.id
                    ? "2px solid var(--vscode-focusBorder)"
                    : "2px solid transparent",
                  opacity: activeTab() === tab.id ? 1 : 0.8,
                }}
                onMouseEnter={(e) => {
                  if (activeTab() !== tab.id) {
                    e.currentTarget.style.background = "var(--vscode-list-hoverBackground)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab() !== tab.id) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {tab.label}
              </button>
            )}
          </For>
        </div>

        {/* Content area */}
        <div style={{
          flex: 1,
          padding: "16px",
          "overflow-y": "auto",
        }}>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;
