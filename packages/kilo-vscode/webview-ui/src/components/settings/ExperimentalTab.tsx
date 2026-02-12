import { Component, For, Show, createMemo } from "solid-js"
import { Switch } from "@kilocode/kilo-ui/switch"
import { Select } from "@kilocode/kilo-ui/select"
import { TextField } from "@kilocode/kilo-ui/text-field"
import { Card } from "@kilocode/kilo-ui/card"
import { useConfig } from "../../context/config"

interface ShareOption {
  value: string
  label: string
}

const SHARE_OPTIONS: ShareOption[] = [
  { value: "manual", label: "Manual" },
  { value: "auto", label: "Auto" },
  { value: "disabled", label: "Disabled" },
]

const SettingsRow: Component<{ label: string; description: string; last?: boolean; children: any }> = (props) => (
  <div
    data-slot="settings-row"
    style={{
      display: "flex",
      "align-items": "center",
      "justify-content": "space-between",
      padding: "8px 0",
      "border-bottom": props.last ? "none" : "1px solid var(--border-weak-base)",
    }}
  >
    <div style={{ flex: 1, "min-width": 0, "margin-right": "12px" }}>
      <div style={{ "font-weight": "500" }}>{props.label}</div>
      <div style={{ "font-size": "11px", color: "var(--text-weak-base, var(--vscode-descriptionForeground))" }}>
        {props.description}
      </div>
    </div>
    {props.children}
  </div>
)

const ExperimentalTab: Component = () => {
  const { config, updateConfig } = useConfig()

  const experimental = createMemo(() => config().experimental ?? {})

  const updateExperimental = (key: string, value: unknown) => {
    updateConfig({
      experimental: { ...experimental(), [key]: value },
    })
  }

  return (
    <div>
      <Card>
        {/* Share mode */}
        <SettingsRow label="Share Mode" description="How session sharing behaves">
          <Select
            options={SHARE_OPTIONS}
            current={SHARE_OPTIONS.find((o) => o.value === (config().share ?? "manual"))}
            value={(o) => o.value}
            label={(o) => o.label}
            onSelect={(o) => o && updateConfig({ share: o.value as "manual" | "auto" | "disabled" })}
            variant="secondary"
            size="small"
            triggerVariant="settings"
          />
        </SettingsRow>

        <div style={{ padding: "8px 0", "border-bottom": "1px solid var(--border-weak-base)" }}>
          <Switch
            checked={config().formatter !== false}
            onChange={(checked) => updateConfig({ formatter: checked ? {} : false })}
            description="Enable the automatic code formatter"
          >
            Formatter
          </Switch>
        </div>

        <div style={{ padding: "8px 0", "border-bottom": "1px solid var(--border-weak-base)" }}>
          <Switch
            checked={config().lsp !== false}
            onChange={(checked) => updateConfig({ lsp: checked ? {} : false })}
            description="Enable language server protocol integration"
          >
            LSP
          </Switch>
        </div>

        <div style={{ padding: "8px 0", "border-bottom": "1px solid var(--border-weak-base)" }}>
          <Switch
            checked={experimental().disable_paste_summary ?? false}
            onChange={(checked) => updateExperimental("disable_paste_summary", checked)}
            description="Don't summarize large pasted content"
          >
            Disable Paste Summary
          </Switch>
        </div>

        <div style={{ padding: "8px 0", "border-bottom": "1px solid var(--border-weak-base)" }}>
          <Switch
            checked={experimental().batch_tool ?? false}
            onChange={(checked) => updateExperimental("batch_tool", checked)}
            description="Enable batching of multiple tool calls"
          >
            Batch Tool
          </Switch>
        </div>

        <div style={{ padding: "8px 0", "border-bottom": "1px solid var(--border-weak-base)" }}>
          <Switch
            checked={experimental().continue_loop_on_deny ?? false}
            onChange={(checked) => updateExperimental("continue_loop_on_deny", checked)}
            description="Continue the agent loop when a permission is denied"
          >
            Continue on Deny
          </Switch>
        </div>

        {/* MCP timeout */}
        <SettingsRow label="MCP Timeout (ms)" description="Timeout for MCP server requests in milliseconds" last>
          <TextField
            value={String(experimental().mcp_timeout ?? 60000)}
            onChange={(val) => {
              const num = parseInt(val, 10)
              if (!isNaN(num) && num > 0) {
                updateExperimental("mcp_timeout", num)
              }
            }}
          />
        </SettingsRow>
      </Card>

      {/* Tool toggles */}
      <Show when={config().tools && Object.keys(config().tools ?? {}).length > 0}>
        <h4 style={{ "margin-top": "16px", "margin-bottom": "8px" }}>Tool Toggles</h4>
        <Card>
          <For each={Object.entries(config().tools ?? {})}>
            {([name, enabled], index) => (
              <div
                style={{
                  padding: "8px 0",
                  "border-bottom":
                    index() < Object.keys(config().tools ?? {}).length - 1
                      ? "1px solid var(--border-weak-base)"
                      : "none",
                }}
              >
                <Switch
                  checked={enabled}
                  onChange={(checked) => updateConfig({ tools: { ...config().tools, [name]: checked } })}
                >
                  {name}
                </Switch>
              </div>
            )}
          </For>
        </Card>
      </Show>
    </div>
  )
}

export default ExperimentalTab
