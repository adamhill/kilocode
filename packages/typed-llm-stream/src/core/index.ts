import { LLMToolSystem } from "./LLMToolSystem.js"
import { BaseLLMTool, LLMToolBuilder } from "./BaseLLMTool.js"
import { StreamingXMLParser } from "./StreamingXMLParser.js"
import type {
	LLMTool,
	LLMToolContext,
	LLMToolResult,
	LLMPromptSection,
	LLMToolSystemConfig,
	LLMToolSystemEvents,
	LLMPromptTemplate,
	StreamingParserOptions,
	LLMTagHandler,
	LLMParserConfig,
} from "./types.js"

// Core classes (class-based API)
export { LLMToolSystem } from "./LLMToolSystem.js"
export { BaseLLMTool, LLMToolBuilder } from "./BaseLLMTool.js"
export { StreamingXMLParser } from "./StreamingXMLParser.js"

// Functional API (JavaScript-friendly)
export {
	createTool,
	createToolSystem as createFunctionalToolSystem,
	createXMLParser,
	createBasicPromptTemplate as createFunctionalPromptTemplate,
} from "./functional.js"

// Types
export type {
	LLMTool,
	LLMToolContext,
	LLMToolResult,
	LLMPromptSection,
	LLMToolSystemConfig,
	LLMToolSystemEvents,
	LLMPromptTemplate,
	StreamingParserOptions,
	LLMTagHandler,
	LLMParserConfig,
} from "./types.js"

// Functional API types
export type {
	Tool,
	ToolSystem,
	ToolConfig,
	XMLParser,
} from "./functional.js"

// Version info
export const VERSION = "1.0.0"

// Factory functions for class-based API
export function createToolSystem(tools: LLMTool[], globalContext?: LLMToolContext) {
	return new LLMToolSystem({ tools, globalContext })
}

export function createBasicPromptTemplate(): LLMPromptTemplate {
	return {
		systemPrefix: "You are an AI assistant. Provide responses in the specified XML formats:\n\n",
		systemSuffix: "\nUse the XML formats above for all responses.",
		sectionSeparator: "\n\n",
		includeToolList: true,
	}
}
