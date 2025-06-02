import { EventEmitter } from "events"
import { StreamingXMLParser } from "./StreamingXMLParser.js"
import {
	LLMTool,
	LLMToolSystemConfig,
	LLMToolContext,
	LLMToolResult,
	LLMToolSystemEvents,
	LLMPromptSection,
	LLMPromptTemplate,
} from "./types.js"

export class LLMToolSystem extends EventEmitter {
	private tools = new Map<string, LLMTool>()
	private parser: StreamingXMLParser
	private globalContext: LLMToolContext
	private promptTemplate: LLMPromptTemplate

	constructor(config: LLMToolSystemConfig) {
		super()
		this.globalContext = config.globalContext || {}
		this.promptTemplate = config.promptTemplate || this.getDefaultPromptTemplate()

		// Register all LLM tools
		config.tools.forEach((tool) => this.registerTool(tool))

		// Create parser with LLM tool handlers
		this.parser = new StreamingXMLParser(this.createParserConfig(), config.parserOptions)
		this.setupParserEvents()
	}

	// LLM tool management
	registerTool(tool: LLMTool): void {
		if (this.tools.has(tool.id)) {
			throw new Error(`LLM tool with id '${tool.id}' is already registered`)
		}

		this.tools.set(tool.id, tool)

		// Recreate parser with updated config
		this.recreateParser()

		this.emit("toolRegistered", { toolId: tool.id })
	}

	unregisterTool(toolId: string): void {
		if (!this.tools.has(toolId)) {
			throw new Error(`LLM tool with id '${toolId}' is not registered`)
		}

		this.tools.delete(toolId)
		this.recreateParser()

		this.emit("toolUnregistered", { toolId })
	}

	enableTool(toolId: string): void {
		const tool = this.tools.get(toolId)
		if (!tool) {
			throw new Error(`LLM tool with id '${toolId}' is not registered`)
		}

		tool.enable()
		this.recreateParser()

		this.emit("toolEnabled", { toolId })
	}

	disableTool(toolId: string): void {
		const tool = this.tools.get(toolId)
		if (!tool) {
			throw new Error(`LLM tool with id '${toolId}' is not registered`)
		}

		tool.disable()
		this.recreateParser()

		this.emit("toolDisabled", { toolId })
	}

	getTool(toolId: string): LLMTool | undefined {
		return this.tools.get(toolId)
	}

	getAllTools(): LLMTool[] {
		return Array.from(this.tools.values())
	}

	getEnabledTools(): LLMTool[] {
		return Array.from(this.tools.values()).filter((tool) => tool.enabled)
	}

	getDisabledTools(): LLMTool[] {
		return Array.from(this.tools.values()).filter((tool) => !tool.enabled)
	}

	// LLM prompt generation
	generateSystemPrompt(context: LLMToolContext = {}): string {
		const mergedContext: LLMToolContext = {
			...this.globalContext,
			...context,
			enabledTools: this.getEnabledTools().map((t) => t.id),
		}

		const enabledTools = this.getEnabledTools()

		if (enabledTools.length === 0) {
			throw new Error("No LLM tools enabled for prompt generation")
		}

		// Use custom formatting if provided
		if (this.promptTemplate.customFormatting) {
			const sections = enabledTools
				.map((tool) => tool.generatePromptSection(mergedContext))
				.sort((a, b) => a.order - b.order)

			return this.promptTemplate.customFormatting(sections)
		}

		// Default LLM prompt generation
		let prompt = this.promptTemplate.systemPrefix || this.getDefaultSystemPrefix()

		// Add each LLM tool's prompt section
		const sections = enabledTools
			.map((tool) => tool.generatePromptSection(mergedContext))
			.sort((a, b) => a.order - b.order)

		const separator = this.promptTemplate.sectionSeparator || "\n\n"

		sections.forEach((section, index) => {
			prompt += `${index + 1}. ${section.content}${separator}`
		})

		// Add tool list if requested
		if (this.promptTemplate.includeToolList) {
			prompt += this.generateToolListSection(enabledTools)
		}

		// Add suffix
		prompt += this.promptTemplate.systemSuffix || this.getDefaultSystemSuffix(enabledTools)

		this.emit("promptGenerated", {
			prompt,
			enabledTools: enabledTools.map((t) => t.id),
			context: mergedContext,
		})

		return prompt
	}

	generateUserPrompt(context: LLMToolContext): string {
		const mergedContext = { ...this.globalContext, ...context }

		const enabledTools = this.getEnabledTools()
		const toolDescriptions = enabledTools
			.map((tool, index) => `${index + 1}. ${tool.description} (${tool.xmlTag})`)
			.join("\n")

		return `
Based on the current context, provide suggestions using the available LLM tools:
${toolDescriptions}

Context: ${JSON.stringify(mergedContext, null, 2)}

IMPORTANT: Your response MUST use the XML formats specified in the system prompt.
`.trim()
	}

	// LLM response processing
	processResponseChunk(chunk: string): void {
		this.parser.write(chunk)
	}

	completeResponse(): void {
		this.parser.end()
	}

	async processCompleteResponse(xmlResponse: string): Promise<LLMToolResult[]> {
		// Create a new parser instance for each complete response to avoid state issues
		const parser = new StreamingXMLParser(this.createParserConfig())
		const results = await parser.parseComplete(xmlResponse)
		parser.destroy()
		return results.map((result) => this.createToolResult(result))
	}

	async *processResponseStream(stream: AsyncIterable<string>): AsyncGenerator<LLMToolResult> {
		this.emit("parsingStarted", { toolCount: this.getEnabledTools().length })
		const startTime = Date.now()
		const results: LLMToolResult[] = []

		try {
			for await (const result of this.parser.parseStream(stream)) {
				const toolResult = this.createToolResult(result)
				results.push(toolResult)

				this.emit("toolResult", toolResult)
				yield toolResult
			}
		} finally {
			const duration = Date.now() - startTime
			this.emit("parsingComplete", { results, duration })
		}
	}

	// LLM context management
	updateGlobalContext(context: Partial<LLMToolContext>): void {
		this.globalContext = { ...this.globalContext, ...context }
	}

	getGlobalContext(): LLMToolContext {
		return { ...this.globalContext }
	}

	setPromptTemplate(template: Partial<LLMPromptTemplate>): void {
		this.promptTemplate = { ...this.promptTemplate, ...template }
	}

	getPromptTemplate(): LLMPromptTemplate {
		return { ...this.promptTemplate }
	}

	// Statistics and introspection for LLM tools
	getStats() {
		return {
			totalTools: this.tools.size,
			enabledTools: this.getEnabledTools().length,
			disabledTools: this.getDisabledTools().length,
			toolsByType: Array.from(this.tools.values()).reduce(
				(acc, tool) => {
					const type = tool.metadata?.type || "unknown"
					acc[type] = (acc[type] || 0) + 1
					return acc
				},
				{} as Record<string, number>,
			),
		}
	}

	// Cleanup
	destroy(): void {
		this.parser.destroy()
		this.tools.clear()
		this.removeAllListeners()
	}

	// Private helper methods
	private recreateParser(): void {
		if (this.parser) {
			this.parser.destroy()
		}
		this.parser = new StreamingXMLParser(this.createParserConfig())
		this.setupParserEvents()
	}

	private createParserConfig() {
		const config: Record<string, any> = {}

		this.tools.forEach((tool) => {
			if (tool.enabled) {
				config[tool.xmlTag] = {
					schema: tool.schema,
					callback: async (data: any, tagName: string, context: LLMToolContext) => {
						try {
							const validatedData = tool.validateResponse(data)
							await tool.handleResponse(validatedData, { ...this.globalContext, ...context })
						} catch (error) {
							this.emit("toolError", {
								toolId: tool.id,
								error: error instanceof Error ? error : new Error(String(error)),
								data,
							})
						}
					},
				}
			}
		})

		return config
	}

	private setupParserEvents(): void {
		this.parser.on("data", (result) => {
			const toolResult = this.createToolResult(result)
			this.emit("toolResult", toolResult)
		})

		this.parser.on("error", ({ error, tagName, data }) => {
			this.emit("toolError", { toolId: tagName || "unknown", error, data })
		})

		this.parser.on("complete", () => {
			// Handled in processResponseStream
		})
	}

	private createToolResult(result: { type: string; data: any }): LLMToolResult {
		return {
			toolId: result.type,
			type: result.type,
			data: result.data,
			timestamp: new Date(),
			confidence: result.data.confidence,
			metadata: result.data.metadata,
		}
	}

	private getDefaultPromptTemplate(): LLMPromptTemplate {
		return {
			systemPrefix:
				"You are an AI assistant that provides structured responses for LLM interactions. You can provide suggestions in the following formats:\n\n",
			systemSuffix: `
When providing LLM responses:
- Use the XML formats specified above for your responses
- Provide confidence scores when applicable
- Include clear reasons for each suggestion
- Focus on practical, useful suggestions
- You MUST provide at least one suggestion in one of the formats`,
			sectionSeparator: "\n\n",
			includeToolList: false,
		}
	}

	private getDefaultSystemPrefix(): string {
		return (
			this.promptTemplate.systemPrefix ||
			"You are an AI assistant that provides structured responses for LLM interactions. You can provide suggestions in the following formats:\n\n"
		)
	}

	private getDefaultSystemSuffix(enabledTools: LLMTool[]): string {
		return (
			this.promptTemplate.systemSuffix ||
			`
When providing LLM responses:
- Use the XML formats specified above for your responses  
- Provide confidence scores when applicable
- Include clear reasons for each suggestion
- Focus on practical, useful suggestions
- You MUST provide at least one suggestion in one of the formats

Available LLM tools: ${enabledTools.map((t) => t.name).join(", ")}`
		)
	}

	private generateToolListSection(enabledTools: LLMTool[]): string {
		return `
Available LLM Tools:
${enabledTools.map((tool) => `- ${tool.name}: ${tool.description}`).join("\n")}

`
	}
}

// Type-safe event emitter
export interface LLMToolSystem {
	on<K extends keyof LLMToolSystemEvents>(event: K, listener: (arg: LLMToolSystemEvents[K]) => void): this
	emit<K extends keyof LLMToolSystemEvents>(event: K, arg: LLMToolSystemEvents[K]): boolean
}
