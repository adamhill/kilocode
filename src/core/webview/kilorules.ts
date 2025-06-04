import os from "os"
import * as path from "path"
import fs from "fs/promises"
import * as vscode from "vscode"
import { fileExistsAtPath } from "../../utils/fs"
import type { ContextProxy } from "../config/ContextProxy"

export interface RulesData {
	globalRules: Record<string, boolean>
	localRules: Record<string, boolean>
	globalWorkflows: Record<string, boolean>
	localWorkflows: Record<string, boolean>
}

export async function getRulesData(
	workspacePath: string,
	contextProxy: ContextProxy,
	context: vscode.ExtensionContext,
): Promise<RulesData> {
	const globalRulesDir = path.join(os.homedir(), ".kilocode", "rules")
	const globalWorkflowsDir = path.join(os.homedir(), ".kilocode", "workflows")

	const localRulesDir = path.join(workspacePath, ".kilocode", "rules")
	const localWorkflowsDir = path.join(workspacePath, ".kilocode", "workflows")

	const globalRulesToggleState =
		((await contextProxy.getGlobalState("globalRulesToggles")) as Record<string, boolean>) || {}
	const localRulesToggleState =
		((await contextProxy.getWorkspaceState(context, "localRulesToggles")) as Record<string, boolean>) || {}
	const globalWorkflowToggleState =
		((await contextProxy.getGlobalState("globalWorkflowToggles")) as Record<string, boolean>) || {}
	const localWorkflowToggleState =
		((await contextProxy.getWorkspaceState(context, "workflowToggles")) as Record<string, boolean>) || {}

	return {
		globalRules: await getRulesFromDirectory(globalRulesDir, globalRulesToggleState),
		localRules: await getRulesFromDirectory(localRulesDir, localRulesToggleState),
		globalWorkflows: await getRulesFromDirectory(globalWorkflowsDir, globalWorkflowToggleState),
		localWorkflows: await getRulesFromDirectory(localWorkflowsDir, localWorkflowToggleState),
	}
}

export async function getRulesFromDirectory(
	dirPath: string,
	toggleState: Record<string, boolean> = {},
): Promise<Record<string, boolean>> {
	const exists = await fileExistsAtPath(dirPath)
	if (!exists) {
		return {}
	}

	const files = await fs.readdir(dirPath, { withFileTypes: true })
	const rules: Record<string, boolean> = {}

	for (const file of files) {
		if (file.isFile() && (file.name.endsWith(".md") || file.name.endsWith(".txt"))) {
			const filePath = path.join(dirPath, file.name)
			// Use stored toggle state if available, otherwise default to true
			rules[filePath] = toggleState[filePath] !== undefined ? toggleState[filePath] : true
		}
	}

	return rules
}
