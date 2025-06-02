/**
 * Example: VSCode Integration
 *
 * This example demonstrates how to integrate the typed-llm-stream library
 * with a VSCode extension. It shows how to create tools that interact with
 * the VSCode API and process LLM responses in a VSCode context.
 *
 * Note: This is a conceptual example and would need to be adapted to work
 * in an actual VSCode extension with the proper imports and setup.
 */

import { LLMToolSystem, BaseLLMTool, LLMToolContext } from "../index.js"
import { z } from "zod"

// Mock VSCode types for the example
interface VSCodeEditor {
	document: { uri: string; fileName: string; getText: () => string }
	selection: { start: { line: number; character: number }; end: { line: number; character: number } }
	edit: (callback: (editBuilder: VSCodeEditBuilder) => void) => Promise<boolean>
}

interface VSCodeEditBuilder {
	replace: (
		range: { start: { line: number; character: number }; end: { line: number; character: number } },
		text: string,
	) => void
	insert: (position: { line: number; character: number }, text: string) => void
	delete: (range: { start: { line: number; character: number }; end: { line: number; character: number } }) => void
}

// Mock VSCode API for the example
const vscode = {
	window: {
		activeTextEditor: null as VSCodeEditor | null,
		showInformationMessage: (message: string) => console.log(`[INFO] ${message}`),
		showErrorMessage: (message: string) => console.log(`[ERROR] ${message}`),
		createOutputChannel: (name: string) => ({
			appendLine: (text: string) => console.log(`[${name}] ${text}`),
			show: () => console.log(`[${name}] Output channel shown`),
		}),
	},
	workspace: {
		openTextDocument: async (uri: string) => ({ uri, getText: () => "Mock document content" }),
		applyEdit: async (edit: any) => true,
	},
}

/**
 * A tool that generates code completions for VSCode
 */
class CodeCompletionTool extends BaseLLMTool {
	constructor() {
		super({
			id: "code-completion",
			name: "Code Completion",
			description: "Generates code completions based on the current context",
			schema: z.object({
				completion: z.string(),
				language: z.string(),
				indentation: z.string().optional(),
				imports: z.array(z.string()).optional(),
			}),
			xmlTag: "completion",
		})
	}

	generatePromptSection(context: LLMToolContext) {
		const editor = context.editor as VSCodeEditor | undefined
		const prefix = editor?.document.getText().substring(0, editor.selection.start.character) || ""
		const language = context.language || "unknown"

		return this.buildXMLPromptSection(
			"CODE COMPLETION - Complete the code based on context",
			`<completion>
  <completion>Code to insert at cursor position</completion>
  <language>Programming language</language>
  <indentation>Detected indentation style (optional)</indentation>
  <imports>
    <import>Additional import that might be needed</import>
    <!-- More imports as needed -->
  </imports>
</completion>`,
			[
				`Complete the code in ${language} based on the prefix`,
				"Maintain consistent style and indentation",
				"Suggest imports if needed",
				"Ensure the completion is syntactically valid",
			],
			1,
		)
	}

	async handleResponse(data: z.infer<typeof this.schema>, context: LLMToolContext) {
		const editor = context.editor as VSCodeEditor | undefined

		if (!editor) {
			vscode.window.showErrorMessage("No active text editor found")
			return
		}

		try {
			// Insert the completion at the cursor position
			await editor.edit((editBuilder) => {
				editBuilder.insert(editor.selection.start, data.completion)
			})

			// Show a notification
			vscode.window.showInformationMessage(`Inserted ${data.language} code completion`)

			// Log any suggested imports
			if (data.imports && data.imports.length > 0) {
				const outputChannel = vscode.window.createOutputChannel("Code Completion")
				outputChannel.appendLine("Suggested imports:")
				data.imports.forEach((imp: string) => outputChannel.appendLine(`- ${imp}`))
				outputChannel.show()
			}
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to insert completion: ${error instanceof Error ? error.message : String(error)}`,
			)
		}

		return data
	}
}

/**
 * A tool that provides code refactoring suggestions
 */
class RefactoringTool extends BaseLLMTool {
	constructor() {
		super({
			id: "refactoring",
			name: "Code Refactoring",
			description: "Suggests code refactoring improvements",
			schema: z.object({
				refactorings: z.array(
					z.object({
						description: z.string(),
						before: z.string(),
						after: z.string(),
						startLine: z.number().optional(),
						endLine: z.number().optional(),
						confidence: z.number().min(0).max(1).optional(),
					}),
				),
				explanation: z.string(),
			}),
			xmlTag: "refactoring",
		})
	}

	generatePromptSection(context: LLMToolContext) {
		return this.buildXMLPromptSection(
			"CODE REFACTORING - Suggest improvements to the code",
			`<refactoring>
  <refactorings>
    <refactoring>
      <description>Brief description of the refactoring</description>
      <before>Code before refactoring</before>
      <after>Code after refactoring</after>
      <startLine>Starting line number (optional)</startLine>
      <endLine>Ending line number (optional)</endLine>
      <confidence>0.0 to 1.0 (optional)</confidence>
    </refactoring>
    <!-- Additional refactorings as needed -->
  </refactorings>
  <explanation>Overall explanation of the refactoring suggestions</explanation>
</refactoring>`,
			[
				"Identify code that could be improved",
				"Suggest specific refactorings with before/after examples",
				"Focus on readability, maintainability, and performance",
				"Provide line numbers when possible for easier application",
			],
			2,
		)
	}

	async handleResponse(data: z.infer<typeof this.schema>, context: LLMToolContext) {
		const editor = context.editor as VSCodeEditor | undefined

		if (!editor) {
			vscode.window.showErrorMessage("No active text editor found")
			return
		}

		// Create an output channel to display the refactoring suggestions
		const outputChannel = vscode.window.createOutputChannel("Refactoring Suggestions")

		outputChannel.appendLine("# Refactoring Suggestions")
		outputChannel.appendLine("")
		outputChannel.appendLine(data.explanation)
		outputChannel.appendLine("")

		data.refactorings.forEach(
			(
				refactoring: {
					description: string
					before: string
					after: string
					startLine?: number
					endLine?: number
					confidence?: number
				},
				index: number,
			) => {
				const confidenceStr = refactoring.confidence
					? ` (Confidence: ${Math.round(refactoring.confidence * 100)}%)`
					: ""

				const locationStr = refactoring.startLine
					? ` [Lines ${refactoring.startLine}-${refactoring.endLine || refactoring.startLine}]`
					: ""

				outputChannel.appendLine(`## Suggestion ${index + 1}${locationStr}${confidenceStr}`)
				outputChannel.appendLine(refactoring.description)
				outputChannel.appendLine("")
				outputChannel.appendLine("```diff")
				outputChannel.appendLine("- " + refactoring.before.replace(/\n/g, "\n- "))
				outputChannel.appendLine("+ " + refactoring.after.replace(/\n/g, "\n+ "))
				outputChannel.appendLine("```")
				outputChannel.appendLine("")
			},
		)

		outputChannel.show()

		return data
	}
}

/**
 * Example of how to use the tools in a VSCode extension
 */
async function vscodeExtensionExample() {
	// Create mock editor for the example
	vscode.window.activeTextEditor = {
		document: {
			uri: "file:///example/path/file.ts",
			fileName: "file.ts",
			getText: () =>
				"function calculateTotal(items) {\n  let total = 0;\n  for (let i = 0; i < items.length; i++) {\n    total += items[i];\n  }\n  return total;\n}",
		},
		selection: {
			start: { line: 3, character: 4 },
			end: { line: 3, character: 4 },
		},
		edit: async (callback) => {
			const mockEditBuilder = {
				replace: (range: any, text: string) => console.log(`[MOCK] Replacing text at line ${range.start.line}`),
				insert: (position: any, text: string) =>
					console.log(
						`[MOCK] Inserting text at line ${position.line}: "${text.substring(0, 20)}${text.length > 20 ? "..." : ""}"`,
					),
				delete: (range: any) =>
					console.log(`[MOCK] Deleting text from line ${range.start.line} to ${range.end.line}`),
			}
			callback(mockEditBuilder)
			return true
		},
	}

	// Create the tools
	const completionTool = new CodeCompletionTool()
	const refactoringTool = new RefactoringTool()

	// Create the tool system
	const toolSystem = new LLMToolSystem({
		tools: [completionTool, refactoringTool],
		globalContext: {
			editor: vscode.window.activeTextEditor,
			language: "typescript",
			indentationStyle: "  ", // 2 spaces
		},
	})

	// Generate the system prompt
	console.log("\n=== VSCODE EXTENSION SYSTEM PROMPT ===\n")
	const systemPrompt = toolSystem.generateSystemPrompt()
	console.log(systemPrompt)

	// Example completion response
	const completionResponse = `
<completion>
  <completion>// Calculate the total price with tax
const totalWithTax = total * 1.1;</completion>
  <language>typescript</language>
  <indentation>  </indentation>
  <imports>
    <import>import { TaxRate } from './config';</import>
  </imports>
</completion>
`

	// Process the completion response
	console.log("\n=== PROCESSING COMPLETION RESPONSE ===\n")
	await toolSystem.processCompleteResponse(completionResponse)

	// Example refactoring response
	const refactoringResponse = `
<refactoring>
  <refactorings>
    <refactoring>
      <description>Use Array.reduce() for cleaner summation</description>
      <before>function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i];
  }
  return total;
}</before>
      <after>function calculateTotal(items) {
  return items.reduce((total, item) => total + item, 0);
}</after>
      <startLine>1</startLine>
      <endLine>6</endLine>
      <confidence>0.95</confidence>
    </refactoring>
    <refactoring>
      <description>Add TypeScript type annotations</description>
      <before>function calculateTotal(items) {</before>
      <after>function calculateTotal(items: number[]): number {</after>
      <startLine>1</startLine>
      <endLine>1</endLine>
      <confidence>0.9</confidence>
    </refactoring>
  </refactorings>
  <explanation>The code can be improved by using more modern JavaScript/TypeScript patterns. Array.reduce() provides a more concise way to sum array elements, and adding type annotations improves type safety and code readability.</explanation>
</refactoring>
`

	// Process the refactoring response
	console.log("\n=== PROCESSING REFACTORING RESPONSE ===\n")
	await toolSystem.processCompleteResponse(refactoringResponse)
}

// For direct execution:
vscodeExtensionExample().catch(console.error)

export { CodeCompletionTool, RefactoringTool, vscodeExtensionExample }
