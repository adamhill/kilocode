import * as vscode from "vscode"
import { KiloProvider } from "./KiloProvider"
import { AgentManagerProvider } from "./AgentManagerProvider"
import { EXTENSION_DISPLAY_NAME } from "./constants"

export function activate(context: vscode.ExtensionContext) {
  console.log("Kilo Code extension is now active")

  // Create the provider with extensionUri and context
  const provider = new KiloProvider(context.extensionUri, context)

  // Register the webview view provider for the sidebar
  context.subscriptions.push(vscode.window.registerWebviewViewProvider(KiloProvider.viewType, provider))

  // Create Agent Manager provider for editor panel
  const agentManagerProvider = new AgentManagerProvider(context.extensionUri)
  context.subscriptions.push(agentManagerProvider)

  // Register toolbar button command handlers
  context.subscriptions.push(
    vscode.commands.registerCommand("kilo-code.new.plusButtonClicked", () => {
      provider.postMessage({ type: "action", action: "plusButtonClicked" })
    }),
    vscode.commands.registerCommand("kilo-code.new.agentManagerOpen", () => {
      agentManagerProvider.openPanel()
    }),
    vscode.commands.registerCommand("kilo-code.new.marketplaceButtonClicked", () => {
      provider.postMessage({ type: "action", action: "marketplaceButtonClicked" })
    }),
    vscode.commands.registerCommand("kilo-code.new.historyButtonClicked", () => {
      provider.postMessage({ type: "action", action: "historyButtonClicked" })
    }),
    vscode.commands.registerCommand("kilo-code.new.profileButtonClicked", () => {
      provider.postMessage({ type: "action", action: "profileButtonClicked" })
    }),
    vscode.commands.registerCommand("kilo-code.new.settingsButtonClicked", () => {
      provider.postMessage({ type: "action", action: "settingsButtonClicked" })
    }),
    vscode.commands.registerCommand("kilo-code.new.openInTab", () => {
      openKiloInNewTab(context)
    }),
  )

  // Add dispose handler to subscriptions
  context.subscriptions.push({
    dispose: () => provider.dispose(),
  })
}

export function deactivate() {}

async function openKiloInNewTab(context: vscode.ExtensionContext) {
  const lastCol = Math.max(
    ...vscode.window.visibleTextEditors.map((e) => e.viewColumn || 0),
    0,
  )
  const hasVisibleEditors = vscode.window.visibleTextEditors.length > 0

  if (!hasVisibleEditors) {
    await vscode.commands.executeCommand("workbench.action.newGroupRight")
  }

  const targetCol = hasVisibleEditors
    ? Math.max(lastCol + 1, 1)
    : vscode.ViewColumn.Two

  const panel = vscode.window.createWebviewPanel(
    "kilo-code.new.TabPanel",
    EXTENSION_DISPLAY_NAME,
    targetCol,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [context.extensionUri],
    },
  )

  panel.iconPath = {
    light: vscode.Uri.joinPath(context.extensionUri, "assets", "icons", "kilo-light.svg"),
    dark: vscode.Uri.joinPath(context.extensionUri, "assets", "icons", "kilo-dark.svg"),
  }

  const tabProvider = new KiloProvider(context.extensionUri, context)
  tabProvider.resolveWebviewPanel(panel)

  await new Promise((r) => setTimeout(r, 100))
  await vscode.commands.executeCommand("workbench.action.lockEditorGroup")

  panel.onDidDispose(
    () => {
      console.log("[Kilo New] Tab panel disposed")
      tabProvider.dispose()
    },
    null,
    context.subscriptions,
  )
}
