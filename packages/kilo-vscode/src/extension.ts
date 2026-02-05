import * as vscode from 'vscode';
import { KiloProvider } from './KiloProvider';
import { AgentManagerProvider } from './AgentManagerProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log('Kilo Code extension is now active');

	// Register the webview view provider for the sidebar
	const provider = new KiloProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(KiloProvider.viewType, provider)
	);

	// Create Agent Manager provider for editor panel
	const agentManagerProvider = new AgentManagerProvider(context.extensionUri);
	context.subscriptions.push(agentManagerProvider);

	// Register toolbar button command handlers
	context.subscriptions.push(
		vscode.commands.registerCommand('kilo-code.plusButtonClicked', () => {
			provider.postMessage({ type: 'action', action: 'plusButtonClicked' });
		}),
		vscode.commands.registerCommand('kilo-code.agentManagerOpen', () => {
			agentManagerProvider.openPanel();
		}),
		vscode.commands.registerCommand('kilo-code.marketplaceButtonClicked', () => {
			provider.postMessage({ type: 'action', action: 'marketplaceButtonClicked' });
		}),
		vscode.commands.registerCommand('kilo-code.historyButtonClicked', () => {
			provider.postMessage({ type: 'action', action: 'historyButtonClicked' });
		}),
		vscode.commands.registerCommand('kilo-code.profileButtonClicked', () => {
			provider.postMessage({ type: 'action', action: 'profileButtonClicked' });
		}),
		vscode.commands.registerCommand('kilo-code.settingsButtonClicked', () => {
			provider.postMessage({ type: 'action', action: 'settingsButtonClicked' });
		})
	);
}

export function deactivate() {}
