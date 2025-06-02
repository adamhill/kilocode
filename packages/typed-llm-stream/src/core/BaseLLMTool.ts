import { z } from "zod"
import { LLMTool, LLMToolContext, LLMPromptSection, LLMToolResult } from "./types.js"

/**
 * Configuration interface for LLM tool creation.
 * This interface defines the required and optional properties for creating an LLM tool.
 */
export interface LLMToolConfig<TSchema extends z.ZodSchema = z.ZodSchema> {
	id: string
	name: string
	description: string
	schema: TSchema
	xmlTag: string
	enabled?: boolean
	metadata?: Record<string, any>
	version?: string
	category?: string
}

/**
 * Base class for implementing LLM tools.
 *
 * This abstract class provides the foundation for creating custom LLM tools.
 * It implements the core functionality required by the LLMTool interface and
 * provides helper methods for common operations.
 *
 * @template TSchema The Zod schema type for validating tool responses
 */
export abstract class BaseLLMTool<TSchema extends z.ZodSchema = z.ZodSchema> implements LLMTool<TSchema> {
	public enabled: boolean
	public metadata?: Record<string, any>
	public readonly version: string
	public readonly category: string

	// All properties from config
	public readonly id: string
	public readonly name: string
	public readonly description: string
	public readonly schema: TSchema
	public readonly xmlTag: string

	constructor(config: LLMToolConfig<TSchema>) {
		// Validate config
		this.validateConfig(config)

		// Assign properties
		this.id = config.id
		this.name = config.name
		this.description = config.description
		this.schema = config.schema
		this.xmlTag = config.xmlTag
		this.enabled = config.enabled ?? true
		this.metadata = config.metadata
		this.version = config.version ?? "1.0.0"
		this.category = config.category ?? "general"
	}

	private validateConfig(config: LLMToolConfig<TSchema>): void {
		if (!config.id || typeof config.id !== "string") {
			throw new Error("LLM tool config must have a valid string id")
		}

		if (!config.name || typeof config.name !== "string") {
			throw new Error("LLM tool config must have a valid string name")
		}

		if (!config.description || typeof config.description !== "string") {
			throw new Error("LLM tool config must have a valid string description")
		}

		if (!config.schema) {
			throw new Error("LLM tool config must have a valid Zod schema")
		}

		if (!config.xmlTag || typeof config.xmlTag !== "string") {
			throw new Error("LLM tool config must have a valid string xmlTag")
		}

		// Validate ID format (alphanumeric + hyphens/underscores only)
		if (!/^[a-zA-Z0-9_-]+$/.test(config.id)) {
			throw new Error("LLM tool id must contain only alphanumeric characters, hyphens, and underscores")
		}

		// Validate XML tag format (valid XML element name)
		if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(config.xmlTag)) {
			throw new Error("LLM tool xmlTag must be a valid XML element name")
		}
	}

	/**
	 * Generate a prompt section for this tool.
	 * This method must be implemented by subclasses to define how the tool's prompt
	 * section is generated based on the provided context.
	 *
	 * @param context The context for generating the prompt section
	 * @returns A prompt section object with id, title, content, and order
	 */
	abstract generatePromptSection(context: LLMToolContext): LLMPromptSection

	/**
	 * Handle a response from the LLM for this tool.
	 * This method must be implemented by subclasses to define how the tool processes
	 * the validated data from the LLM response.
	 *
	 * @param data The validated data from the LLM response
	 * @param context The context for handling the response
	 * @returns A promise that resolves when the response has been handled
	 */
	abstract handleResponse(data: z.infer<TSchema>, context: LLMToolContext): Promise<void> | void

	/**
	 * Default implementations that can be overridden by subclasses
	 */
	/**
	 * Validate the response data against the tool's schema.
	 * This method uses the tool's schema to validate the response data and
	 * throws an error if the data is invalid.
	 *
	 * @param data The data to validate
	 * @returns The validated data
	 * @throws Error if the data is invalid
	 */
	validateResponse(data: unknown): z.infer<TSchema> {
		try {
			return this.schema.parse(data)
		} catch (error) {
			throw new Error(
				`Validation failed for LLM tool ${this.id}: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	/**
	 * Enable this tool.
	 * This method enables the tool so that it will be included in prompt generation
	 * and response processing.
	 */
	enable(): void {
		this.enabled = true
	}

	/**
	 * Disable this tool.
	 * This method disables the tool so that it will not be included in prompt generation
	 * and response processing.
	 */
	disable(): void {
		this.enabled = false
	}

	/**
	 * Create a clone of this tool.
	 * This method creates a new instance of the tool with the same configuration.
	 *
	 * @returns A new instance of the tool with the same configuration
	 */
	clone(): LLMTool<TSchema> {
		const ClonedClass = this.constructor as new (config: LLMToolConfig<TSchema>) => this
		return new ClonedClass({
			id: this.id,
			name: this.name,
			description: this.description,
			schema: this.schema,
			xmlTag: this.xmlTag,
			enabled: this.enabled,
			metadata: this.metadata ? { ...this.metadata } : undefined,
			version: this.version,
			category: this.category,
		})
	}

	/**
	 * Helper methods for LLM tool subclasses
	 */

	/**
	 * Create a prompt section with the tool's ID and name.
	 * This is a helper method for creating a prompt section with the tool's ID and name.
	 *
	 * @param content The content of the prompt section
	 * @param order The order of the prompt section (default: 0)
	 * @returns A prompt section object
	 */
	protected createPromptSection(content: string, order: number = 0): LLMPromptSection {
		return {
			id: this.id,
			title: this.name,
			content: content.trim(),
			order,
		}
	}

	/**
	 * Create a result object for this tool.
	 * This is a helper method for creating a result object with the tool's ID.
	 *
	 * @param type The type of the result
	 * @param data The data of the result
	 * @param confidence The confidence score of the result (optional)
	 * @param metadata Additional metadata for the result (optional)
	 * @returns A result object
	 */
	protected createResult<T>(
		type: string,
		data: T,
		confidence?: number,
		metadata?: Record<string, any>,
	): LLMToolResult<T> {
		return {
			toolId: this.id,
			type,
			data,
			confidence,
			timestamp: new Date(),
			metadata,
		}
	}

	/**
	 * Build an XML prompt section with a title, XML structure, and instructions.
	 * This is a helper method for building a prompt section with a standardized format.
	 *
	 * @param title The title of the prompt section
	 * @param xmlStructure The XML structure to include in the prompt section
	 * @param instructions The instructions to include in the prompt section
	 * @param priority The priority of the prompt section (default: 0)
	 * @returns A prompt section object
	 */
	public buildXMLPromptSection(
		title: string,
		xmlStructure: string,
		instructions: string[],
		priority: number = 0,
	): LLMPromptSection {
		const content = `
${title}:
${xmlStructure.trim()}

${instructions.map((instruction) => `- ${instruction}`).join("\n")}
`.trim()

		return this.createPromptSection(content, priority)
	}

	/**
	 * Generate XML structure from a Zod schema.
	 * This method automatically creates an XML example based on the schema definition.
	 *
	 * @param rootTag The root XML tag name
	 * @param schema The Zod schema to generate XML from
	 * @param isArrayItem Whether this is an item in an array (for proper indentation)
	 * @param indentLevel The current indentation level
	 * @returns A string containing the XML structure
	 */
	public generateXMLFromSchema(
		rootTag: string,
		schema: z.ZodSchema,
		isArrayItem: boolean = false,
		indentLevel: number = 0,
	): string {
		const indent = "  ".repeat(indentLevel)
		const childIndent = "  ".repeat(indentLevel + 1)
		let xml = ""

		// Handle array schemas
		if (schema instanceof z.ZodArray) {
			const itemSchema = schema._def.type
			const itemTag = this.getSingularTagName(rootTag)

			xml += `${indent}<${rootTag}>\n`
			xml += this.generateXMLFromSchema(itemTag, itemSchema, true, indentLevel + 1)
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
				const tagName = this.camelToSnakeCase(key)

				if (fieldSchema instanceof z.ZodObject || fieldSchema instanceof z.ZodArray) {
					// Nested object or array
					xml += this.generateXMLFromSchema(tagName, fieldSchema, false, indentLevel + 1)
					xml += "\n"
				} else {
					// Simple field
					const description = this.getSchemaDescription(fieldSchema as z.ZodTypeAny)
					const exampleValue = this.getExampleValueForSchema(fieldSchema as z.ZodTypeAny)

					if (fieldSchema instanceof z.ZodOptional) {
						xml += `${childIndent}<${tagName}>${exampleValue} (optional)</${tagName}>\n`
					} else if (fieldSchema instanceof z.ZodEnum) {
						const options = fieldSchema._def.values.join("|")
						xml += `${childIndent}<${tagName}>${options}</${tagName}>\n`
					} else {
						xml += `${childIndent}<${tagName}>${exampleValue}</${tagName}>\n`
					}
				}
			}

			if (!isArrayItem) {
				xml += `${indent}</${rootTag}>`
			} else {
				xml += `${indent}</${rootTag}>`
			}

			return xml
		}

		// Handle primitive types
		const exampleValue = this.getExampleValueForSchema(schema)
		xml += `${indent}<${rootTag}>${exampleValue}</${rootTag}>`
		return xml
	}

	/**
	 * Extract instructions from a Zod schema based on descriptions.
	 * This method generates usage instructions by analyzing the schema's structure and descriptions.
	 *
	 * @param schema The Zod schema to extract instructions from
	 * @param customInstructions Additional custom instructions to include
	 * @returns An array of instruction strings
	 */
	public extractInstructionsFromSchema(schema: z.ZodSchema, customInstructions: string[] = []): string[] {
		const instructions: string[] = [...customInstructions]

		// Add generic instructions based on schema type
		if (schema instanceof z.ZodArray) {
			instructions.push(`Provide one or more ${this.getSingularTagName(this.xmlTag)} elements as needed`)

			// Extract instructions from the array item schema
			const itemSchema = schema._def.type
			if (itemSchema instanceof z.ZodObject) {
				this.extractObjectSchemaInstructions(itemSchema, instructions)
			}
		} else if (schema instanceof z.ZodObject) {
			this.extractObjectSchemaInstructions(schema, instructions)
		}

		return instructions
	}

	/**
	 * Helper method to extract instructions from object schema properties
	 */
	private extractObjectSchemaInstructions(schema: z.ZodObject<any>, instructions: string[]): void {
		const shape = schema._def.shape()

		// Look for required fields with descriptions
		for (const [key, fieldSchema] of Object.entries(shape)) {
			const description = this.getSchemaDescription(fieldSchema as z.ZodTypeAny)
			const isOptional = fieldSchema instanceof z.ZodOptional

			if (description && !isOptional) {
				instructions.push(`Include ${this.camelToSnakeCase(key)}: ${description}`)
			}
		}
	}

	/**
	 * Get a description from a Zod schema if available
	 */
	private getSchemaDescription(schema: z.ZodTypeAny): string | undefined {
		if (schema instanceof z.ZodOptional) {
			return this.getSchemaDescription(schema._def.innerType)
		}

		// @ts-ignore - Accessing internal _def.description
		return schema._def.description
	}

	/**
	 * Get an example value for a schema type
	 */
	private getExampleValueForSchema(schema: z.ZodTypeAny): string {
		if (schema instanceof z.ZodString) {
			return "text"
		} else if (schema instanceof z.ZodNumber) {
			return "number"
		} else if (schema instanceof z.ZodBoolean) {
			return "true|false"
		} else if (schema instanceof z.ZodEnum) {
			return schema._def.values.join("|")
		} else if (schema instanceof z.ZodOptional) {
			return this.getExampleValueForSchema(schema._def.innerType)
		} else {
			return "value"
		}
	}

	/**
	 * Convert camelCase to snake_case for XML tags
	 */
	private camelToSnakeCase(str: string): string {
		return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replace(/^_/, "")
	}

	/**
	 * Get singular form of a tag name for array items
	 */
	private getSingularTagName(pluralTag: string): string {
		// Simple pluralization rules
		if (pluralTag.endsWith("s")) {
			return pluralTag.slice(0, -1)
		}
		return pluralTag + "_item"
	}

	/**
	 * Build a nested XML structure for LLM responses.
	 * This is a helper method for building a nested XML structure with fields.
	 *
	 * @param tagName The name of the root tag
	 * @param fields The fields to include in the XML structure
	 * @returns An XML string
	 */
	protected buildNestedXMLStructure(tagName: string, fields: Record<string, string | string[]>): string {
		let xml = `<${tagName}>\n`

		Object.entries(fields).forEach(([fieldName, fieldInfo]) => {
			if (Array.isArray(fieldInfo)) {
				xml += `  <!-- ${fieldName}: ${fieldInfo.join(" | ")} -->\n`
				xml += `  <${fieldName}>${fieldInfo[0]}</${fieldName}>\n`
			} else {
				xml += `  <${fieldName}>${fieldInfo}</${fieldName}>\n`
			}
		})

		xml += `</${tagName}>`
		return xml
	}

	/**
	 * Generate context-aware instructions for LLM prompts.
	 * This method adds context-specific instructions to the base instructions.
	 *
	 * @param context The context for generating instructions
	 * @param baseInstructions The base instructions to extend
	 * @returns An array of instructions
	 */
	protected getContextualInstructions(context: LLMToolContext, baseInstructions: string[]): string[] {
		const instructions = [...baseInstructions]

		// Add LLM context-specific instructions
		if (context.currentFile) {
			instructions.push(`Current file context: ${context.currentFile}`)
		}

		if (context.recentActivity?.length) {
			instructions.push("Consider recent activity patterns in your LLM response")
		}

		if (context.llmModel) {
			instructions.push(`Optimize response for ${context.llmModel} capabilities`)
		}

		return instructions
	}

	/**
	 * Utility methods for tool information
	 */

	/**
	 * Get information about this tool.
	 * This method returns the tool's configuration.
	 *
	 * @returns The tool's configuration
	 */
	getInfo(): LLMToolConfig<TSchema> {
		return {
			id: this.id,
			name: this.name,
			description: this.description,
			schema: this.schema,
			xmlTag: this.xmlTag,
			enabled: this.enabled,
			metadata: this.metadata,
			version: this.version,
			category: this.category,
		}
	}

	/**
	 * Get a string representation of this tool.
	 * This method returns a string representation of the tool.
	 *
	 * @returns A string representation of the tool
	 */
	toString(): string {
		return `LLMTool(${this.id}): ${this.name} [${this.enabled ? "enabled" : "disabled"}]`
	}
}

// Builder pattern for more complex LLM tool configuration
export class LLMToolBuilder<TSchema extends z.ZodSchema> {
	private config: Partial<LLMToolConfig<TSchema>> = {}

	static create<T extends z.ZodSchema>(id: string): LLMToolBuilder<T> {
		const builder = new LLMToolBuilder<T>()
		builder.config.id = id
		return builder
	}

	name(name: string): this {
		this.config.name = name
		return this
	}

	description(description: string): this {
		this.config.description = description
		return this
	}

	schema(schema: TSchema): this {
		this.config.schema = schema
		return this
	}

	xmlTag(xmlTag: string): this {
		this.config.xmlTag = xmlTag
		return this
	}

	enabled(enabled: boolean = true): this {
		this.config.enabled = enabled
		return this
	}

	metadata(metadata: Record<string, any>): this {
		this.config.metadata = { ...this.config.metadata, ...metadata }
		return this
	}

	version(version: string): this {
		this.config.version = version
		return this
	}

	category(category: string): this {
		this.config.category = category
		return this
	}

	build(): LLMToolConfig<TSchema> {
		// Validate required fields
		if (!this.config.id) throw new Error("LLM tool id is required")
		if (!this.config.name) throw new Error("LLM tool name is required")
		if (!this.config.description) throw new Error("LLM tool description is required")
		if (!this.config.schema) throw new Error("LLM tool schema is required")
		if (!this.config.xmlTag) throw new Error("LLM tool xmlTag is required")

		return this.config as LLMToolConfig<TSchema>
	}
}
