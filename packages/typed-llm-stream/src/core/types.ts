import { z } from "zod"

// Generic context for LLM interactions that can be extended for specific use cases
export interface LLMToolContext {
	[key: string]: any
}

// LLM prompt section structure
export interface LLMPromptSection {
	id: string
	title: string
	content: string
	order: number
}

// Generic LLM tool result
export interface LLMToolResult<T = any> {
	toolId: string
	type: string
	data: T
	confidence?: number
	timestamp: Date
	metadata?: Record<string, any>
}

// Generic LLM tool interface - the core abstraction for LLM interactions
export interface LLMTool<TSchema extends z.ZodSchema = z.ZodSchema, TData = z.infer<TSchema>> {
	readonly id: string
	readonly name: string
	readonly description: string
	readonly schema: TSchema
	readonly xmlTag: string
	readonly enabled: boolean
	readonly metadata?: Record<string, any>

	// Core LLM tool methods
	generatePromptSection(context: LLMToolContext): LLMPromptSection
	handleResponse(data: TData, context: LLMToolContext): Promise<void> | void
	validateResponse(data: unknown): TData

	// Tool management
	enable(): void
	disable(): void
	clone(): LLMTool<TSchema, TData>
}

// LLM tool system configuration
export interface LLMToolSystemConfig {
	tools: LLMTool[]
	globalContext?: LLMToolContext
	promptTemplate?: LLMPromptTemplate
	parserOptions?: StreamingParserOptions
}

// LLM prompt template system
export interface LLMPromptTemplate {
	systemPrefix?: string
	systemSuffix?: string
	sectionSeparator?: string
	includeToolList?: boolean
	customFormatting?: (sections: LLMPromptSection[]) => string
}

// Parser configuration for LLM responses
export interface StreamingParserOptions {
	lowercase?: boolean
	normalize?: boolean
	xmlns?: boolean
	position?: boolean
	strictMode?: boolean
}

// Events emitted by the LLM tool system
export interface LLMToolSystemEvents {
	toolResult: LLMToolResult
	toolError: { toolId: string; error: Error; data?: any }
	promptGenerated: { prompt: string; enabledTools: string[]; context: LLMToolContext }
	parsingStarted: { toolCount: number }
	parsingComplete: { results: LLMToolResult[]; duration: number }
	toolEnabled: { toolId: string }
	toolDisabled: { toolId: string }
	toolRegistered: { toolId: string }
	toolUnregistered: { toolId: string }
}

// Generic tag handler for LLM XML responses
export interface LLMTagHandler<T> {
	schema: z.ZodSchema<T>
	callback: (data: T, tagName: string, context: LLMToolContext) => void | Promise<void>
}

// Parser configuration for LLM responses
export interface LLMParserConfig {
	[tagName: string]: LLMTagHandler<any>
}
