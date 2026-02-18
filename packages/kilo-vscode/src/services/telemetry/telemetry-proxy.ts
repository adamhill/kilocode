import * as vscode from "vscode"
import { TelemetryEventName, type TelemetryPropertiesProvider } from "./types"


/**
 * Singleton proxy that captures telemetry events and forwards them to the CLI
 * server via POST /telemetry/capture. The CLI handles PostHog delivery.
 */
export class TelemetryProxy {
  private static singleton: TelemetryProxy | undefined

  private url: string | undefined
  private password: string | undefined
  private provider: TelemetryPropertiesProvider | undefined

  private constructor() {}

  static getInstance(): TelemetryProxy {
    return (TelemetryProxy.singleton ??= new TelemetryProxy())
  }

  static capture(event: TelemetryEventName, properties?: Record<string, unknown>) {
    TelemetryProxy.getInstance().capture(event, properties)
  }

  /**
   * Configure the CLI server connection. Must be called before capture() will send events.
   */
  configure(url: string, password: string) {
    this.url = url
    this.password = password
  }

  setProvider(provider: TelemetryPropertiesProvider) {
    this.provider = provider
  }

  isVSCodeTelemetryEnabled(): boolean {
    const level = vscode.workspace.getConfiguration("telemetry").get<string>("telemetryLevel", "all")
    return level === "all"
  }

  /**
   * Fire-and-forget capture. Enriches with provider properties, then POSTs to CLI.
   */
  capture(event: TelemetryEventName, properties?: Record<string, unknown>) {
    if (!this.isVSCodeTelemetryEnabled()) return
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
   * No-op — the CLI server handles PostHog shutdown.
   */
  shutdown() {}
}
