import * as vscode from 'vscode';
import { KiloProvider } from './KiloProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log('Kilo Code extension is now active');

	// Register the webview view provider for the sidebar
	const provider = new KiloProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(KiloProvider.viewType, provider)
	);
}

export function deactivate() {}
