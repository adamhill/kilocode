import path from "path"
import os from "os"
import * as vscode from "vscode"
import { ClineRulesToggles } from "../../../shared/cline-rules"
import { ContextProxy } from "../../config/ContextProxy"
import { GlobalFileNames } from "../../../shared/globalFileNames"
import { synchronizeRuleToggles } from "./rule-helpers"

/**
 * Refresh the workflow toggles
 */
export async function refreshWorkflowToggles(
	context: vscode.ExtensionContext,
	workingDirectory: string,
): Promise<{
	globalWorkflowToggles: ClineRulesToggles
	localWorkflowToggles: ClineRulesToggles
}> {
	const proxy = new ContextProxy(context)

	// Global workflows
	const globalWorkflowToggles = ((await proxy.getGlobalState("globalWorkflowToggles")) as ClineRulesToggles) || {}
	const globalWorkflowsDir = path.join(os.homedir(), ".kilocode", "workflows")
	const updatedGlobalWorkflowToggles = await synchronizeRuleToggles(globalWorkflowsDir, globalWorkflowToggles)
	await proxy.updateGlobalState("globalWorkflowToggles", updatedGlobalWorkflowToggles)

	// Local workflows
	const workflowRulesToggles =
		((await proxy.getWorkspaceState(context, "workflowToggles")) as ClineRulesToggles) || {}
	const workflowsDirPath = path.resolve(workingDirectory, GlobalFileNames.workflows)
	const updatedWorkflowToggles = await synchronizeRuleToggles(workflowsDirPath, workflowRulesToggles)
	await proxy.updateWorkspaceState(context, "workflowToggles", updatedWorkflowToggles)

	return {
		globalWorkflowToggles: updatedGlobalWorkflowToggles,
		localWorkflowToggles: updatedWorkflowToggles,
	}
}
