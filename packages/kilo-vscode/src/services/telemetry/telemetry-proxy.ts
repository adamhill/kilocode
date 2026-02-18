import * as vscode from "vscode"
import { TelemetryEventName, type TelemetryPropertiesProvider, type TelemetrySetting } from "./types"
import {
  isApiProviderError,
  getApiProviderErrorProperties,
  isConsecutiveMistakeError,
  getConsecutiveMistakeErrorProperties,
} from "./errors"

/**
 * Singleton proxy that captures telemetry events and forwards them to the CLI
 * server via POST /telemetry/capture. The CLI handles PostHog delivery.
 */
export class TelemetryProxy {
  private static instance: TelemetryProxy | undefined

  private url: string | undefined
  private password: string | undefined
  private provider: TelemetryPropertiesProvider | undefined
  private setting: TelemetrySetting = "unset"

  private constructor() {}

  static createInstance(): TelemetryProxy {
    TelemetryProxy.instance = new TelemetryProxy()
    return TelemetryProxy.instance
  }

  static getInstance(): TelemetryProxy {
    if (!TelemetryProxy.instance) {
      throw new Error("TelemetryProxy not initialized — call createInstance() first")
    }
    return TelemetryProxy.instance
  }

  /**
   * Return the singleton if it exists, or undefined. Useful for fire-and-forget
   * callers (e.g. autocomplete telemetry) that should silently no-op when the
   * proxy has not been initialised yet.
   */
  static tryGetInstance(): TelemetryProxy | undefined {
    return TelemetryProxy.instance
  }

  /**
   * Configure the CLI server connection. Must be called before capture() will send events.
   */
  configure(url: string, password: string) {
    this.url = url
    this.password = password
  }

  /**
   * Attach a provider that supplies context properties for every event.
   */
  setProvider(provider: TelemetryPropertiesProvider) {
    this.provider = provider
  }

  /**
   * Update the extension-level telemetry preference.
   */
  updateTelemetryState(setting: TelemetrySetting) {
    this.setting = setting
  }

  /**
   * Check whether telemetry is enabled based on VS Code level + extension setting.
   */
  isTelemetryEnabled(): boolean {
    // Extension setting: "disabled" always wins
    if (this.setting === "disabled") return false

    // Respect VS Code's global telemetry level (from workspace config)
    const level = vscode.workspace.getConfiguration("telemetry").get<string>("telemetryLevel", "all")
    if (level !== "all") return false

    return true
  }

  /**
   * Fire-and-forget capture. Enriches with provider properties, then POSTs to CLI.
   */
  capture(event: TelemetryEventName, properties?: Record<string, unknown>) {
    if (!this.isTelemetryEnabled()) return
    if (!this.url || !this.password) return

    const merged = {
      ...this.provider?.getTelemetryProperties(),
      ...properties,
    }

    const payload = JSON.stringify({ event, properties: merged })
    const auth = `Basic ${Buffer.from(`kilo:${this.password}`).toString("base64")}`

    fetch(`${this.url}/telemetry/capture`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: payload,
    }).catch(() => {})
  }

  /**
   * Capture an exception. Extracts structured properties from known error types.
   */
  captureException(error: Error, extra?: Record<string, unknown>) {
    const properties: Record<string, unknown> = {
      error: error.message,
      errorName: error.name,
      ...extra,
    }

    if (isApiProviderError(error)) {
      Object.assign(properties, getApiProviderErrorProperties(error))
    }

    if (isConsecutiveMistakeError(error)) {
      Object.assign(properties, getConsecutiveMistakeErrorProperties(error))
      this.capture(TelemetryEventName.CONSECUTIVE_MISTAKE_ERROR, properties)
      return
    }

    // Generic exception — use the error name as the event or a fallback
    this.capture(TelemetryEventName.SCHEMA_VALIDATION_ERROR, properties)
  }

  // ============================================
  // Typed capture helpers
  // ============================================

  captureTaskCreated(properties: Record<string, unknown>) {
    this.capture(TelemetryEventName.TASK_CREATED, properties)
  }

  captureTaskReopened(properties: Record<string, unknown>) {
    this.capture(TelemetryEventName.TASK_RESTARTED, properties)
  }

  captureTaskCompleted(properties: Record<string, unknown>) {
    this.capture(TelemetryEventName.TASK_COMPLETED, properties)
  }

  captureConversationMessage(properties: Record<string, unknown>) {
    this.capture(TelemetryEventName.TASK_CONVERSATION_MESSAGE, properties)
  }

  captureLlmCompletion(properties: Record<string, unknown>) {
    this.capture(TelemetryEventName.LLM_COMPLETION, properties)
  }

  captureToolUsed(properties: Record<string, unknown>) {
    this.capture(TelemetryEventName.TOOL_USED, properties)
  }

  captureModeSwitched(properties: Record<string, unknown>) {
    this.capture(TelemetryEventName.MODE_SWITCH, properties)
  }

  captureCheckpointCreated(properties: Record<string, unknown>) {
    this.capture(TelemetryEventName.CHECKPOINT_CREATED, properties)
  }

  captureCheckpointRestored(properties: Record<string, unknown>) {
    this.capture(TelemetryEventName.CHECKPOINT_RESTORED, properties)
  }

  captureCheckpointDiffed(properties: Record<string, unknown>) {
    this.capture(TelemetryEventName.CHECKPOINT_DIFFED, properties)
  }

  captureTabShown(properties: Record<string, unknown>) {
    this.capture(TelemetryEventName.TAB_SHOWN, properties)
  }

  captureTitleButtonClicked(properties: Record<string, unknown>) {
    this.capture(TelemetryEventName.TITLE_BUTTON_CLICKED, properties)
  }

  capturePromptEnhanced(properties: Record<string, unknown>) {
    this.capture(TelemetryEventName.PROMPT_ENHANCED, properties)
  }

  captureCodeActionUsed(properties: Record<string, unknown>) {
    this.capture(TelemetryEventName.CODE_ACTION_USED, properties)
  }

  /**
   * No-op — the CLI server handles PostHog shutdown.
   */
  shutdown() {}
}
