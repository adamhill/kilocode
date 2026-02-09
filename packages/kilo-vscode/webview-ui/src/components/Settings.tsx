import { Component, createSignal, For, JSX } from "solid-js"
import {
  Plug,
  Users2,
  CheckCheck,
  SquareMousePointer,
  GitBranch,
  Monitor,
  Bot,
  Bell,
  Database,
  SquareTerminal,
  MessageSquare,
  FlaskConical,
  Globe,
  Info,
  ArrowLeft,
} from "lucide-solid"
import ProvidersTab from "./settings/ProvidersTab"
import AgentBehaviourTab from "./settings/AgentBehaviourTab"
import AutoApproveTab from "./settings/AutoApproveTab"
import BrowserTab from "./settings/BrowserTab"
import CheckpointsTab from "./settings/CheckpointsTab"
import DisplayTab from "./settings/DisplayTab"
import AutocompleteTab from "./settings/AutocompleteTab"
import NotificationsTab from "./settings/NotificationsTab"
import ContextTab from "./settings/ContextTab"
import TerminalTab from "./settings/TerminalTab"
import PromptsTab from "./settings/PromptsTab"
import ExperimentalTab from "./settings/ExperimentalTab"
import LanguageTab from "./settings/LanguageTab"
import AboutKiloCodeTab from "./settings/AboutKiloCodeTab"
import { useServer } from "../context/server"

export interface SettingsProps {
  onBack?: () => void
}

type TabId =
  | "providers"
  | "agentBehaviour"
  | "autoApprove"
  | "browser"
  | "checkpoints"
  | "display"
  | "autocomplete"
  | "notifications"
  | "context"
  | "terminal"
  | "prompts"
  | "experimental"
  | "language"
  | "aboutKiloCode"

interface TabConfig {
  id: TabId
  label: string
  icon: () => JSX.Element
}

const tabs: TabConfig[] = [
  { id: "providers", label: "Providers", icon: () => <Plug size={18} /> },
  { id: "agentBehaviour", label: "Agent Behaviour", icon: () => <Users2 size={18} /> },
  { id: "autoApprove", label: "Auto-Approve", icon: () => <CheckCheck size={18} /> },
  { id: "browser", label: "Browser", icon: () => <SquareMousePointer size={18} /> },
  { id: "checkpoints", label: "Checkpoints", icon: () => <GitBranch size={18} /> },
  { id: "display", label: "Display", icon: () => <Monitor size={18} /> },
  { id: "autocomplete", label: "Autocomplete", icon: () => <Bot size={18} /> },
  { id: "notifications", label: "Notifications", icon: () => <Bell size={18} /> },
  { id: "context", label: "Context", icon: () => <Database size={18} /> },
  { id: "terminal", label: "Terminal", icon: () => <SquareTerminal size={18} /> },
  { id: "prompts", label: "Prompts", icon: () => <MessageSquare size={18} /> },
  { id: "experimental", label: "Experimental", icon: () => <FlaskConical size={18} /> },
  { id: "language", label: "Language", icon: () => <Globe size={18} /> },
  { id: "aboutKiloCode", label: "About Kilo Code", icon: () => <Info size={18} /> },
]

const Settings: Component<SettingsProps> = (props) => {
  const server = useServer()
  const [activeTab, setActiveTab] = createSignal<TabId>("providers")

  const getTabIcon = (tabId: TabId) => {
    const tab = tabs.find((t) => t.id === tabId)
    return tab ? tab.icon() : null
  }

  const getTabLabel = (tabId: TabId) => {
    const tab = tabs.find((t) => t.id === tabId)
    return tab ? tab.label : ""
  }

  const renderTabContent = () => {
    switch (activeTab()) {
      case "providers":
        return <ProvidersTab />
      case "agentBehaviour":
        return <AgentBehaviourTab />
      case "autoApprove":
        return <AutoApproveTab />
      case "browser":
        return <BrowserTab />
      case "checkpoints":
        return <CheckpointsTab />
      case "display":
        return <DisplayTab />
      case "autocomplete":
        return <AutocompleteTab />
      case "notifications":
        return <NotificationsTab />
      case "context":
        return <ContextTab />
      case "terminal":
        return <TerminalTab />
      case "prompts":
        return <PromptsTab />
      case "experimental":
        return <ExperimentalTab />
      case "language":
        return <LanguageTab />
      case "aboutKiloCode":
        return <AboutKiloCodeTab port={server.serverInfo()?.port ?? null} connectionState={server.connectionState()} />
    }
  }

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        height: "100%",
        color: "var(--vscode-foreground)",
        "font-family": "var(--vscode-font-family)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          "border-bottom": "1px solid var(--vscode-panel-border)",
          display: "flex",
          "align-items": "center",
          "justify-content": "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            "align-items": "center",
            gap: "8px",
          }}
        >
          <button
            onClick={() => props.onBack?.()}
            title="Done"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--vscode-foreground)",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              "align-items": "center",
              "justify-content": "center",
              "border-radius": "4px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--vscode-toolbar-hoverBackground)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <h2
            style={{
              "font-size": "16px",
              "font-weight": "600",
              margin: 0,
              color: "var(--vscode-foreground)",
            }}
          >
            Settings
          </h2>
        </div>
        <button
          disabled
          style={{
            background: "var(--vscode-button-background)",
            color: "var(--vscode-button-foreground)",
            border: "none",
            padding: "6px 14px",
            "border-radius": "2px",
            "font-size": "13px",
            cursor: "not-allowed",
            opacity: 0.5,
          }}
        >
          Save
        </button>
      </div>

      {/* Main content area with sidebar and content */}
      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* Tab sidebar */}
        <div
          style={{
            width: "192px",
            "flex-shrink": 0,
            "border-right": "1px solid var(--vscode-panel-border)",
            "overflow-y": "auto",
            display: "flex",
            "flex-direction": "column",
          }}
        >
          <For each={tabs}>
            {(tab) => (
              <button
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: "100%",
                  height: "48px",
                  padding: "0 16px",
                  border: "none",
                  background: activeTab() === tab.id ? "var(--vscode-list-activeSelectionBackground)" : "transparent",
                  color:
                    activeTab() === tab.id
                      ? "var(--vscode-list-activeSelectionForeground)"
                      : "var(--vscode-foreground)",
                  "text-align": "left",
                  cursor: "pointer",
                  "font-size": "13px",
                  "font-family": "var(--vscode-font-family)",
                  "border-left":
                    activeTab() === tab.id ? "2px solid var(--vscode-focusBorder)" : "2px solid transparent",
                  opacity: activeTab() === tab.id ? 1 : 0.7,
                  display: "flex",
                  "align-items": "center",
                  gap: "12px",
                }}
                onMouseEnter={(e) => {
                  if (activeTab() !== tab.id) {
                    e.currentTarget.style.background = "var(--vscode-list-hoverBackground)"
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab() !== tab.id) {
                    e.currentTarget.style.background = "transparent"
                  }
                }}
              >
                {tab.icon()}
                <span>{tab.label}</span>
              </button>
            )}
          </For>
        </div>

        {/* Content area */}
        <div
          style={{
            flex: 1,
            "overflow-y": "auto",
            display: "flex",
            "flex-direction": "column",
          }}
        >
          {/* Section header */}
          <div
            style={{
              padding: "16px",
              "border-bottom": "1px solid var(--vscode-panel-border)",
              display: "flex",
              "align-items": "center",
              gap: "8px",
            }}
          >
            {getTabIcon(activeTab())}
            <h3
              style={{
                "font-size": "14px",
                "font-weight": "600",
                margin: 0,
                color: "var(--vscode-foreground)",
              }}
            >
              {getTabLabel(activeTab())}
            </h3>
          </div>

          {/* Tab content */}
          <div
            style={{
              flex: 1,
              padding: "16px",
              "overflow-y": "auto",
            }}
          >
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
