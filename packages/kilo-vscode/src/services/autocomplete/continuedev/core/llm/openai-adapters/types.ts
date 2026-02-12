import * as z from "zod"

// Base config objects
const BaseConfig = z.object({
  provider: z.string(),
})

const BasePlusConfig = BaseConfig.extend({
  apiBase: z.string().optional(),
  apiKey: z.string().optional(),
})

// OpenAI and compatible
export const OpenAIConfigSchema = BasePlusConfig.extend({
	provider: z.union([
		z.literal("openai"),
		z.literal("openrouter"),
		z.literal("mock"),
	]),
})
export type OpenAIConfig = z.infer<typeof OpenAIConfigSchema>

const _MockConfigSchema = BasePlusConfig.extend({
  provider: z.literal("mock"),
})

// Discriminated union — only providers we actually use
export type LLMConfig =
	| OpenAIConfig
	| z.infer<typeof _MockConfigSchema>
