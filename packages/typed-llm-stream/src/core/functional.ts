import { z } from "zod"
import type { LLMTool, LLMToolContext, LLMPromptSection, LLMToolResult, LLMPromptTemplate } from "./types.js"

// Types for our functional API
export interface ToolConfig<TSchema extends z.ZodTypeAny = z.ZodTypeAny, TData = z.infer<TSchema>> {
	id: string
	name: string
	description: string
	schema: TSchema
	xmlTag: string
	handler?: (data: TData, context: any) => Promise<any> | any
	enabled?: boolean
	metadata?: Record<string, any>
	version?: string
	category?: string
}

// Type for tool registry to maintain type information
export type ToolRegistry = {
	[id: string]: {
		tool: Tool<any>
		schema: z.ZodTypeAny
		dataType: any
	}
}

export interface ToolSystem<T extends ToolRegistry = {}> {
	// Add a tool and return a new system with updated registry type
	addTool: <S extends z.ZodTypeAny, R = z.infer<S>>(
		tool: Tool<S, R>,
	) => ToolSystem<T & { [K in typeof tool.id]: { tool: Tool<S, R>; schema: S; dataType: R } }>

	// Type-safe callbacks
	onToolResponse: {
		// Global callback for any tool
		<K extends keyof T>(callback: (toolId: K, data: T[K]["dataType"]) => void): ToolSystem<T>

		// Tool-specific callback with proper typing
		<K extends keyof T & string>(toolId: K, callback: (data: T[K]["dataType"]) => void): ToolSystem<T>
	}

	generatePrompt: (options: { userMessage: string; systemMessage?: string }) => string

	processStream: (
		stream: AsyncIterable<string>,
		options?: {
			onChunk?: (chunk: string) => void
			onComplete?: () => void
			onError?: (error: Error) => void
		},
	) => Promise<ToolSystem<T>>

	terminateStream: (reason?: string) => ToolSystem<T>

	// Type-safe results
	getResults: () => { [K in keyof T]?: T[K]["dataType"] }
	getResult: <K extends keyof T>(toolId: K) => T[K]["dataType"] | undefined
}

export interface Tool<TSchema extends z.ZodTypeAny = z.ZodTypeAny, TData = z.infer<TSchema>> {
	id: string
	name: string
	description: string
	schema: TSchema
	xmlTag: string
	enabled: boolean
	metadata?: Record<string, any>
	version: string
	category: string
	generateXML: () => string
	generatePrompt: (instructions?: string[]) => LLMPromptSection
	handleResponse: (data: TData, context: any) => Promise<any> | any
}

export interface XMLParser {
	processChunk: (chunk: string) => Array<{ toolId: string; data: any }>
}

// Helper functions for XML generation and parsing
function generateXMLFromSchema(
	rootTag: string,
	schema: z.ZodTypeAny,
	isArrayItem: boolean = false,
	indentLevel: number = 0,
): string {
	const indent = "  ".repeat(indentLevel)
	const childIndent = "  ".repeat(indentLevel + 1)
	let xml = ""

	// Handle array schemas
	if (schema instanceof z.ZodArray) {
		const itemSchema = schema._def.type
		const itemTag = getSingularTagName(rootTag)

		xml += `${indent}<${rootTag}>\n`
		xml += generateXMLFromSchema(itemTag, itemSchema, true, indentLevel + 1)
		xml += `${childIndent}<!-- Additional ${itemTag} elements as needed -->\n`
		xml += `${indent}</${rootTag}>`
		return xml
	}

	// Handle object schemas
	if (schema instanceof z.ZodObject) {
		const shape = schema._def.shape()

		if (!isArrayItem) {
			xml += `${indent}<${rootTag}>\n`
		} else {
			xml += `${indent}<${rootTag}>\n`
		}

		// Process each property in the object
		for (const [key, fieldSchema] of Object.entries(shape)) {
			const tagName = camelToSnakeCase(key)

			if (fieldSchema instanceof z.ZodObject || fieldSchema instanceof z.ZodArray) {
				// Nested object or array
				xml += generateXMLFromSchema(tagName, fieldSchema, false, indentLevel + 1)
				xml += "\n"
			} else {
				// Simple field
				const exampleValue = getExampleValueForSchema(fieldSchema as z.ZodTypeAny)

				if (fieldSchema instanceof z.ZodOptional) {
					xml += `${childIndent}<${tagName}>${exampleValue} (optional)</${tagName}>\n`
				} else if (fieldSchema instanceof z.ZodEnum) {
					const options = (fieldSchema as any)._def.values.join("|")
					xml += `${childIndent}<${tagName}>${options}</${tagName}>\n`
				} else {
					xml += `${childIndent}<${tagName}>${exampleValue}</${tagName}>\n`
				}
			}
		}

		xml += `${indent}</${rootTag}>`
		return xml
	}

	// Handle primitive types
	const exampleValue = getExampleValueForSchema(schema)
	xml += `${indent}<${rootTag}>${exampleValue}</${rootTag}>`
	return xml
}

function extractInstructionsFromSchema(
	schema: z.ZodTypeAny,
	xmlTag: string,
	customInstructions: string[] = [],
): string[] {
	const instructions: string[] = [...customInstructions]

	// Add generic instructions based on schema type
	if (schema instanceof z.ZodArray) {
		instructions.push(`Provide one or more ${getSingularTagName(xmlTag)} elements as needed`)

		// Extract instructions from the array item schema
		const itemSchema = schema._def.type
		if (itemSchema instanceof z.ZodObject) {
			extractObjectSchemaInstructions(itemSchema, instructions)
		}
	} else if (schema instanceof z.ZodObject) {
		extractObjectSchemaInstructions(schema, instructions)
	}

	return instructions
}

function extractObjectSchemaInstructions(schema: z.ZodObject<any>, instructions: string[]): void {
	const shape = schema._def.shape()

	// Look for required fields with descriptions
	for (const [key, fieldSchema] of Object.entries(shape)) {
		const description = getSchemaDescription(fieldSchema as z.ZodTypeAny)
		const isOptional = fieldSchema instanceof z.ZodOptional

		if (description && !isOptional) {
			instructions.push(`Include ${camelToSnakeCase(key)}: ${description}`)
		}
	}
}

function getSchemaDescription(schema: z.ZodTypeAny): string | undefined {
	if (schema instanceof z.ZodOptional) {
		return getSchemaDescription(schema._def.innerType)
	}

	// @ts-ignore - Accessing internal _def.description
	return schema._def.description
}

function getExampleValueForSchema(schema: z.ZodTypeAny): string {
	if (schema instanceof z.ZodString) {
		return "text"
	} else if (schema instanceof z.ZodNumber) {
		return "number"
	} else if (schema instanceof z.ZodBoolean) {
		return "true|false"
	} else if (schema instanceof z.ZodEnum) {
		return (schema as any)._def.values.join("|")
	} else if (schema instanceof z.ZodOptional) {
		return getExampleValueForSchema(schema._def.innerType)
	} else {
		return "value"
	}
}

function camelToSnakeCase(str: string): string {
	return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replace(/^_/, "")
}

function getSingularTagName(pluralTag: string): string {
	// Simple pluralization rules
	if (pluralTag.endsWith("s")) {
		return pluralTag.slice(0, -1)
	}
	return pluralTag + "_item"
}

// Simple XML parsing for demonstration
function findCompleteTags(xml: string): Array<{ tag: string; content: string }> {
	// This is a simplified implementation - in a real library, use a proper XML parser
	const result: Array<{ tag: string; content: string }> = []
	const tagRegex = /<(\w+)>([\s\S]*?)<\/\1>/g
	let match

	while ((match = tagRegex.exec(xml)) !== null) {
		result.push({
			tag: match[1],
			content: match[2],
		})
	}

	return result
}

function removeProcessedTags(xml: string, processedTags: Array<{ tag: string; content: string }>): string {
	// This is a simplified implementation - in a real library, use a proper XML parser
	let result = xml
	for (const { tag, content } of processedTags) {
		const fullTag = `<${tag}>${content}</${tag}>`
		result = result.replace(fullTag, "")
	}
	return result
}

function validateXML(content: string, schema: z.ZodTypeAny): any {
	// This is a simplified implementation - in a real library, use a proper XML parser
	// and validation system
	try {
		// Parse XML to JS object (simplified)
		const obj = JSON.parse(
			`{${content
				.split("\n")
				.map((line) => {
					const match = line.trim().match(/<(\w+)>(.*?)<\/\1>/)
					if (match) {
						return `"${match[1]}": "${match[2]}"`
					}
					return ""
				})
				.filter(Boolean)
				.join(",")}}`,
		)

		// Validate with schema
		return schema.parse(obj)
	} catch (error) {
		console.error("XML validation error:", error)
		throw new Error(`Validation failed: ${error instanceof Error ? error.message : String(error)}`)
	}
}

// Main factory functions
export function createTool<TSchema extends z.ZodTypeAny = z.ZodTypeAny, TData = z.infer<TSchema>>(
	config: ToolConfig<TSchema, TData>,
): Tool<TSchema, TData> {
	// Validate config
	if (!config.id || typeof config.id !== "string") {
		throw new Error("Tool config must have a valid string id")
	}
	if (!config.name || typeof config.name !== "string") {
		throw new Error("Tool config must have a valid string name")
	}
	if (!config.description || typeof config.description !== "string") {
		throw new Error("Tool config must have a valid string description")
	}
	if (!config.schema) {
		throw new Error("Tool config must have a valid Zod schema")
	}
	if (!config.xmlTag || typeof config.xmlTag !== "string") {
		throw new Error("Tool config must have a valid string xmlTag")
	}

	// Return the tool object
	return {
		id: config.id,
		name: config.name,
		description: config.description,
		schema: config.schema,
		xmlTag: config.xmlTag,
		enabled: config.enabled ?? true,
		metadata: config.metadata,
		version: config.version ?? "1.0.0",
		category: config.category ?? "general",

		generateXML() {
			return generateXMLFromSchema(this.xmlTag, this.schema)
		},

		generatePrompt(instructions = []) {
			const xmlStructure = this.generateXML()
			const allInstructions = extractInstructionsFromSchema(this.schema, this.xmlTag, instructions)

			return {
				id: this.id,
				title: this.name,
				content: `
${this.name}:
${xmlStructure.trim()}

${allInstructions.map((instruction) => `- ${instruction}`).join("\n")}
`.trim(),
				order: 0,
			}
		},

		async handleResponse(data, context) {
			return config.handler ? config.handler(data, context) : data
		},
	}
}

export function createToolSystem<T extends ToolRegistry = {}>(initialTools: Tool<any, any>[] = []): ToolSystem<T> {
	// Private state
	type ToolId = keyof T & string
	const toolsById: Record<string, Tool<any, any>> = {}
	const results = new Map<string, any>()
	const callbacks: Record<string, ((data: any) => void)[]> = {}
	let globalCallbacks: ((toolId: string, data: any) => void)[] = []
	let streamController: AbortController | null = null

	// Add initial tools
	initialTools.forEach((tool) => {
		toolsById[tool.id] = tool
	})

	// Create XML parser
	function createParser(): XMLParser {
		let buffer = ""
		const toolsByTag: Record<string, Tool<any, any>> = {}

		// Map tools by XML tag
		Object.values(toolsById).forEach((tool) => {
			toolsByTag[tool.xmlTag] = tool
		})

		return {
			processChunk(chunk: string) {
				// Add to buffer
				buffer += chunk

				// Find complete tags
				const completeTags = findCompleteTags(buffer)

				// Update buffer
				buffer = removeProcessedTags(buffer, completeTags)

				// Process complete tags
				return completeTags
					.map(({ tag, content }) => {
						const tool = toolsByTag[tag]
						if (!tool) return null

						try {
							const data = validateXML(content, tool.schema)
							return { toolId: tool.id, data }
						} catch (error) {
							console.error(`Error validating ${tag}:`, error)
							return null
						}
					})
					.filter((result): result is { toolId: string; data: any } => result !== null)
			},
		}
	}

	// The system object with type-safe implementation
	const system = {
		addTool<S extends z.ZodTypeAny, R = z.infer<S>>(tool: Tool<S, R>) {
			toolsById[tool.id] = tool
			// Cast to maintain type information about the new tool
			return system as unknown as ToolSystem<
				T & { [K in typeof tool.id]: { tool: Tool<S, R>; schema: S; dataType: R } }
			>
		},

		onToolResponse(
			toolIdOrCallback: ((toolId: string, data: any) => void) | string,
			callback?: (data: any) => void,
		) {
			if (typeof toolIdOrCallback === "function") {
				// Global callback
				globalCallbacks.push(toolIdOrCallback)
			} else {
				// Tool-specific callback
				if (!callbacks[toolIdOrCallback]) {
					callbacks[toolIdOrCallback] = []
				}
				if (callback) {
					callbacks[toolIdOrCallback].push(callback)
				}
			}
			return system
		},

		generatePrompt({ userMessage, systemMessage = "" }) {
			const toolSections = Object.values(toolsById)
				.filter((tool) => tool.enabled)
				.map((tool) => tool.generatePrompt())
				.sort((a, b) => a.order - b.order)

			return `${systemMessage}\n\n${toolSections.map((s) => s.content).join("\n\n")}\n\n${userMessage}`
		},

		async processStream(stream, options = {}) {
			const { onChunk, onComplete, onError } = options
			const parser = createParser()

			streamController = new AbortController()
			const { signal } = streamController

			try {
				for await (const chunk of stream) {
					if (signal.aborted) break

					if (onChunk) onChunk(chunk)

					const parsedTools = parser.processChunk(chunk)

					for (const { toolId, data } of parsedTools) {
						// Store result
						results.set(toolId, data)

						// Call tool handler
						const tool = toolsById[toolId]
						const result = await tool.handleResponse(data, { system })

						// Check for termination request
						if (result && typeof result === "object" && result.control?.terminateStream) {
							system.terminateStream(result.control.reason)
							break
						}

						// Fire callbacks
						globalCallbacks.forEach((cb) => cb(toolId, data))
						if (callbacks[toolId]) {
							callbacks[toolId].forEach((cb) => cb(data))
						}
					}
				}

				if (onComplete) onComplete()
			} catch (error) {
				if (onError) onError(error instanceof Error ? error : new Error(String(error)))
			}

			return system
		},

		terminateStream(reason = "Manually terminated") {
			if (streamController) {
				streamController.abort(reason)
			}
			return system
		},

		getResults() {
			// Cast the results to the expected type
			return Object.fromEntries(results) as { [K in keyof T]?: T[K]["dataType"] }
		},

		getResult(toolId: string) {
			// Cast the result to the expected type
			return results.get(toolId) as any
		},
	} as ToolSystem<T>

	return system
}

export function createXMLParser(tools: Tool<any, any>[]): XMLParser {
	// Private state
	let buffer = ""
	const toolsByTag: Record<string, Tool<any, any>> = {}

	// Map tools by XML tag
	tools.forEach((tool) => {
		toolsByTag[tool.xmlTag] = tool
	})

	return {
		processChunk(chunk: string) {
			// Add to buffer
			buffer += chunk

			// Find complete tags
			const completeTags = findCompleteTags(buffer)

			// Update buffer
			buffer = removeProcessedTags(buffer, completeTags)

			// Process complete tags
			return completeTags
				.map(({ tag, content }) => {
					const tool = toolsByTag[tag]
					if (!tool) return null

					try {
						const data = validateXML(content, tool.schema)
						return { toolId: tool.id, data }
					} catch (error) {
						console.error(`Error validating ${tag}:`, error)
						return null
					}
				})
				.filter((result): result is { toolId: string; data: any } => result !== null)
		},
	}
}

// Helper function to create a basic prompt template
export function createBasicPromptTemplate(): LLMPromptTemplate {
	return {
		systemPrefix: "You are an AI assistant. Provide responses in the specified XML formats:\n\n",
		systemSuffix: "\nUse the XML formats above for all responses.",
		sectionSeparator: "\n\n",
		includeToolList: true,
	}
}
