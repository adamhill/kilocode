import { Component } from "solid-js"
import { Button } from "@kilocode/kilo-ui/button"
import { Icon } from "@kilocode/kilo-ui/icon"
import { Tabs } from "@kilocode/kilo-ui/tabs"
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

const Settings: Component<SettingsProps> = (props) => {
  const server = useServer()

  return (
    <div data-component="settings-page">
      {/* Header */}
      <div data-slot="settings-header">
        <div data-slot="settings-header-left">
          <Button variant="ghost" size="small" onClick={() => props.onBack?.()} title="Done">
            <Icon name="arrow-left" />
          </Button>
          <h2 data-slot="settings-title">Settings</h2>
        </div>
      </div>

      {/* Settings tabs */}
      <Tabs orientation="vertical" variant="settings" defaultValue="providers" class="settings-tabs">
        <Tabs.List>
          <Tabs.SectionTitle>Configuration</Tabs.SectionTitle>
          <Tabs.Trigger value="providers">
            <Icon name="providers" />
            Providers
          </Tabs.Trigger>
          <Tabs.Trigger value="agentBehaviour">
            <Icon name="brain" />
            Agent Behaviour
          </Tabs.Trigger>
          <Tabs.Trigger value="autoApprove">
            <Icon name="checklist" />
            Auto-Approve
          </Tabs.Trigger>
          <Tabs.Trigger value="browser">
            <Icon name="window-cursor" />
            Browser
          </Tabs.Trigger>
          <Tabs.Trigger value="checkpoints">
            <Icon name="branch" />
            Checkpoints
          </Tabs.Trigger>
          <Tabs.Trigger value="display">
            <Icon name="eye" />
            Display
          </Tabs.Trigger>
          <Tabs.Trigger value="autocomplete">
            <Icon name="code-lines" />
            Autocomplete
          </Tabs.Trigger>
          <Tabs.Trigger value="notifications">
            <Icon name="circle-check" />
            Notifications
          </Tabs.Trigger>
          <Tabs.Trigger value="context">
            <Icon name="server" />
            Context
          </Tabs.Trigger>
          <Tabs.Trigger value="terminal">
            <Icon name="console" />
            Terminal
          </Tabs.Trigger>
          <Tabs.Trigger value="prompts">
            <Icon name="comment" />
            Prompts
          </Tabs.Trigger>
          <Tabs.Trigger value="experimental">
            <Icon name="settings-gear" />
            Experimental
          </Tabs.Trigger>
          <Tabs.Trigger value="language">
            <Icon name="speech-bubble" />
            Language
          </Tabs.Trigger>
          <Tabs.Trigger value="aboutKiloCode">
            <Icon name="help" />
            About Kilo Code
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="providers">
          <h3 data-slot="settings-content-title">Providers</h3>
          <ProvidersTab />
        </Tabs.Content>
        <Tabs.Content value="agentBehaviour">
          <h3 data-slot="settings-content-title">Agent Behaviour</h3>
          <AgentBehaviourTab />
        </Tabs.Content>
        <Tabs.Content value="autoApprove">
          <h3 data-slot="settings-content-title">Auto-Approve</h3>
          <AutoApproveTab />
        </Tabs.Content>
        <Tabs.Content value="browser">
          <h3 data-slot="settings-content-title">Browser</h3>
          <BrowserTab />
        </Tabs.Content>
        <Tabs.Content value="checkpoints">
          <h3 data-slot="settings-content-title">Checkpoints</h3>
          <CheckpointsTab />
        </Tabs.Content>
        <Tabs.Content value="display">
          <h3 data-slot="settings-content-title">Display</h3>
          <DisplayTab />
        </Tabs.Content>
        <Tabs.Content value="autocomplete">
          <h3 data-slot="settings-content-title">Autocomplete</h3>
          <AutocompleteTab />
        </Tabs.Content>
        <Tabs.Content value="notifications">
          <h3 data-slot="settings-content-title">Notifications</h3>
          <NotificationsTab />
        </Tabs.Content>
        <Tabs.Content value="context">
          <h3 data-slot="settings-content-title">Context</h3>
          <ContextTab />
        </Tabs.Content>
        <Tabs.Content value="terminal">
          <h3 data-slot="settings-content-title">Terminal</h3>
          <TerminalTab />
        </Tabs.Content>
        <Tabs.Content value="prompts">
          <h3 data-slot="settings-content-title">Prompts</h3>
          <PromptsTab />
        </Tabs.Content>
        <Tabs.Content value="experimental">
          <h3 data-slot="settings-content-title">Experimental</h3>
          <ExperimentalTab />
        </Tabs.Content>
        <Tabs.Content value="language">
          <h3 data-slot="settings-content-title">Language</h3>
          <LanguageTab />
        </Tabs.Content>
        <Tabs.Content value="aboutKiloCode">
          <h3 data-slot="settings-content-title">About Kilo Code</h3>
          <AboutKiloCodeTab port={server.serverInfo()?.port ?? null} connectionState={server.connectionState()} />
        </Tabs.Content>
      </Tabs>
    </div>
  )
}

export default Settings
