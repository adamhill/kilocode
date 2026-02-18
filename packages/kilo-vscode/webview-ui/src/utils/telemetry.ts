/**
 * Thin helper for the webview to send telemetry events to the extension host.
 * The extension host's KiloProvider forwards these to TelemetryProxy → CLI server.
 *
 * Uses window.postMessage-style access so it works without the Solid.js context.
 * The VS Code webview API is stored globally by the VSCodeProvider context on first mount,
 * but we access it via the global `acquireVsCodeApi` cache stored on window by vscode.tsx.
 */

/**
 * Fire-and-forget telemetry capture from the webview.
 * Posts a message to the extension host which forwards it to the CLI server.
 */
export function captureTelemetryEvent(event: string, properties?: Record<string, unknown>) {
  try {
    // The VS Code webview API is available globally after acquireVsCodeApi() is called.
    // We access __vscodeApi which is set by the VSCodeProvider in vscode.tsx.
    // Fallback: if not available yet, silently drop — telemetry is fire-and-forget.
    const api = (globalThis as Record<string, unknown>).__vscodeApi as
      | { postMessage(msg: unknown): void }
      | undefined
    if (!api) return
    api.postMessage({ type: "telemetry", event, properties })
  } catch {
    // Never crash on telemetry failures
  }
}
