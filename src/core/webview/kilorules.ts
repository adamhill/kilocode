import os from "os"
import * as path from "path"
import fs from "fs/promises"
import * as vscode from "vscode"
import { fileExistsAtPath } from "../../utils/fs"
import { openFile } from "../../integrations/misc/open-file"
import { getWorkspacePath } from "../../utils/path"
import type { ContextProxy } from "../config/ContextProxy"
import type { ClineRulesToggles } from "../../shared/cline-rules"

export interface RulesData {
	globalRules: Record<string, boolean>
	localRules: Record<string, boolean>
	globalWorkflows: Record<string, boolean>
	localWorkflows: Record<string, boolean>
}

const rulesSubfolder = path.join(".kilocode", "rules")
const workflowsSubfolder = path.join(".kilocode", "workflows")

export async function getEnabledRules(
	workspacePath: string,
	contextProxy: ContextProxy,
	context: vscode.ExtensionContext,
): Promise<RulesData> {
	const homedir = os.homedir()
	return {
		globalRules: await getEnabledRulesFromDirectory(
			path.join(homedir, rulesSubfolder),
			((await contextProxy.getGlobalState("globalRulesToggles")) as Record<string, boolean>) || {},
		),
		localRules: await getEnabledRulesFromDirectory(
			path.join(workspacePath, rulesSubfolder),
			((await contextProxy.getWorkspaceState(context, "localRulesToggles")) as Record<string, boolean>) || {},
		),
		globalWorkflows: await getEnabledRulesFromDirectory(
			path.join(os.homedir(), workflowsSubfolder),
			((await contextProxy.getGlobalState("globalWorkflowToggles")) as Record<string, boolean>) || {},
		),
		localWorkflows: await getEnabledRulesFromDirectory(
			path.join(workspacePath, workflowsSubfolder),
			((await contextProxy.getWorkspaceState(context, "workflowToggles")) as Record<string, boolean>) || {},
		),
	}
}

async function getEnabledRulesFromDirectory(
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
			rules[filePath] = toggleState[filePath] ?? true
		}
	}

	return rules
}

export async function toggleWorkflow(
	workflowPath: string,
	enabled: boolean,
	isGlobal: boolean,
	contextProxy: ContextProxy,
	context: vscode.ExtensionContext,
): Promise<void> {
	if (isGlobal) {
		const toggles = ((await contextProxy.getGlobalState("globalWorkflowToggles")) as ClineRulesToggles) || {}
		toggles[workflowPath] = enabled
		await contextProxy.updateGlobalState("globalWorkflowToggles", toggles)
	} else {
		const toggles = ((await contextProxy.getWorkspaceState(context, "workflowToggles")) as ClineRulesToggles) || {}
		toggles[workflowPath] = enabled
		await contextProxy.updateWorkspaceState(context, "workflowToggles", toggles)
	}
}

export async function toggleRule(
	rulePath: string,
	enabled: boolean,
	isGlobal: boolean,
	contextProxy: ContextProxy,
	context: vscode.ExtensionContext,
): Promise<void> {
	if (isGlobal) {
		const toggles = ((await contextProxy.getGlobalState("globalRulesToggles")) as Record<string, boolean>) || {}
		toggles[rulePath] = enabled
		await contextProxy.updateGlobalState("globalRulesToggles", toggles)
	} else {
		const toggles =
			((await contextProxy.getWorkspaceState(context, "localRulesToggles")) as Record<string, boolean>) || {}
		toggles[rulePath] = enabled
		await contextProxy.updateWorkspaceState(context, "localRulesToggles", toggles)
	}
}

export async function createRule(filename: string, isGlobal: boolean, ruleType: string): Promise<void> {
	const workspacePath = getWorkspacePath()
	if (!workspacePath && !isGlobal) {
		vscode.window.showErrorMessage("No workspace folder found")
		return
	}

	let rulesDir: string
	if (isGlobal) {
		const homeDir = os.homedir()
		rulesDir = ruleType === "workflow" ? path.join(homeDir, workflowsSubfolder) : path.join(homeDir, rulesSubfolder)
	} else {
		rulesDir =
			ruleType === "workflow"
				? path.join(workspacePath, workflowsSubfolder)
				: path.join(workspacePath, rulesSubfolder)
	}

	await fs.mkdir(rulesDir, { recursive: true })

	const filePath = path.join(rulesDir, filename)

	if (await fileExistsAtPath(filePath)) {
		vscode.window.showErrorMessage(`File ${filename} already exists`)
		return
	}

	const baseFileName = path.basename(filename)
	const content =
		ruleType === "workflow"
			? `# ${baseFileName}\n\nWorkflow description here...\n\n## Steps\n\n1. Step 1\n2. Step 2\n`
			: `# ${baseFileName}\n\nRule description here...\n\n## Guidelines\n\n- Guideline 1\n- Guideline 2\n`

	await fs.writeFile(filePath, content, "utf8")
	await openFile(filePath)
}

export async function deleteRule(rulePath: string): Promise<void> {
	const deleteAction = "Delete"
	const result = await vscode.window.showWarningMessage(
		`Are you sure you want to delete ${path.basename(rulePath)}?`,
		{ modal: true },
		deleteAction,
	)

	if (result === deleteAction) {
		await fs.unlink(rulePath)
		vscode.window.showInformationMessage(`Deleted ${path.basename(rulePath)}`)
	}
}
