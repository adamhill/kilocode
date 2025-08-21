import { Anthropic } from "@anthropic-ai/sdk"
import OpenAI from "openai"
import axios from "axios"

import { type ModelInfo, openAiModelInfoSaneDefaults, LMSTUDIO_DEFAULT_TEMPERATURE } from "@roo-code/types"

import type { ApiHandlerOptions } from "../../shared/api"

import { XmlMatcher } from "../../utils/xml-matcher"

import { convertToOpenAiMessages } from "../transform/openai-format"
import { ApiStream } from "../transform/stream"

import { BaseProvider } from "./base-provider"
import type { SingleCompletionHandler, ApiHandlerCreateMessageMetadata } from "../index"
import { fetchWithTimeout } from "./kilocode/fetchWithTimeout"

const LMSTUDIO_TIMEOUT_MS = 3_600_000 // kilocode_change
import { getModels, getModelsFromCache } from "./fetchers/modelCache"

export class LmStudioHandler extends BaseProvider implements SingleCompletionHandler {
	protected options: ApiHandlerOptions
	private client: OpenAI

	constructor(options: ApiHandlerOptions) {
		super()
		this.options = options
		// kilocode_change: Temporarily remove custom fetch to test if it's causing empty request bodies
		this.client = new OpenAI({
			baseURL: (this.options.lmStudioBaseUrl || "http://localhost:1234") + "/v1",
			apiKey: "noop",
			timeout: LMSTUDIO_TIMEOUT_MS, // kilocode_change
			// fetch: fetchWithTimeout(LMSTUDIO_TIMEOUT_MS), // kilocode_change - temporarily disabled
		})
		// kilocode_change end
	}

	override async *createMessage(
		systemPrompt: string,
		messages: Anthropic.Messages.MessageParam[],
		metadata?: ApiHandlerCreateMessageMetadata,
	): ApiStream {
		const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{ role: "system", content: systemPrompt },
			...convertToOpenAiMessages(messages),
		]

		// kilocode_change: Ensure we never send completely empty message arrays
		if (openAiMessages.length === 0) {
			console.warn("[LM Studio] No messages to send, adding default system message")
			openAiMessages.push({ role: "system", content: "You are a helpful AI assistant." })
		}
		// kilocode_change end

		// -------------------------
		// Track token usage
		// -------------------------
		const toContentBlocks = (
			blocks: Anthropic.Messages.MessageParam[] | string,
		): Anthropic.Messages.ContentBlockParam[] => {
			if (typeof blocks === "string") {
				return [{ type: "text", text: blocks }]
			}

			const result: Anthropic.Messages.ContentBlockParam[] = []
			for (const msg of blocks) {
				if (typeof msg.content === "string") {
					result.push({ type: "text", text: msg.content })
				} else if (Array.isArray(msg.content)) {
					for (const part of msg.content) {
						if (part.type === "text") {
							result.push({ type: "text", text: part.text })
						}
					}
				}
			}
			return result
		}

		let inputTokens = 0
		try {
			inputTokens = await this.countTokens([{ type: "text", text: systemPrompt }, ...toContentBlocks(messages)])
		} catch (err) {
			console.error("[LmStudio] Failed to count input tokens:", err)
			inputTokens = 0
		}

		let assistantText = ""

		try {
			// kilocode_change: Ensure model ID is not empty to prevent malformed requests
			const model = this.getModel()
			if (!model.id || model.id.trim() === "") {
				throw new Error("LM Studio model ID is not configured. Please select a model in the settings.")
			}
			
			console.log(`[LM Studio] Creating chat completion with model: ${model.id}, messages count: ${openAiMessages.length}`)
			console.log(`[LM Studio] OpenAI messages:`, JSON.stringify(openAiMessages, null, 2))
			// kilocode_change end

			const params: OpenAI.Chat.ChatCompletionCreateParamsStreaming & { draft_model?: string } = {
				model: model.id,
				messages: openAiMessages,
				temperature: this.options.modelTemperature ?? LMSTUDIO_DEFAULT_TEMPERATURE,
				stream: true,
			}

			// kilocode_change: Add comprehensive debugging for request params
			console.log(`[LM Studio] Request params:`, JSON.stringify(params, null, 2))
			console.log(`[LM Studio] OpenAI client config:`, {
				baseURL: this.client.baseURL,
				timeout: LMSTUDIO_TIMEOUT_MS
			})
			// kilocode_change end

			if (this.options.lmStudioSpeculativeDecodingEnabled && this.options.lmStudioDraftModelId) {
				params.draft_model = this.options.lmStudioDraftModelId
			}

			const results = await this.client.chat.completions.create(params)

			const matcher = new XmlMatcher(
				"think",
				(chunk) =>
					({
						type: chunk.matched ? "reasoning" : "text",
						text: chunk.data,
					}) as const,
			)

			for await (const chunk of results) {
				const delta = chunk.choices[0]?.delta

				if (delta?.content) {
					assistantText += delta.content
					for (const processedChunk of matcher.update(delta.content)) {
						yield processedChunk
					}
				}
			}

			for (const processedChunk of matcher.final()) {
				yield processedChunk
			}

			let outputTokens = 0
			try {
				outputTokens = await this.countTokens([{ type: "text", text: assistantText }])
			} catch (err) {
				console.error("[LmStudio] Failed to count output tokens:", err)
				outputTokens = 0
			}

			yield {
				type: "usage",
				inputTokens,
				outputTokens,
			} as const
		} catch (error) {
			throw new Error(
				"Please check the LM Studio developer logs to debug what went wrong. You may need to load the model with a larger context length to work with Kilo Code's prompts.",
			)
		}
	}

	override getModel(): { id: string; info: ModelInfo } {
		const models = getModelsFromCache("lmstudio")
		if (models && this.options.lmStudioModelId && models[this.options.lmStudioModelId]) {
			return {
				id: this.options.lmStudioModelId,
				info: models[this.options.lmStudioModelId],
			}
		} else {
			return {
				id: this.options.lmStudioModelId || "",
				info: openAiModelInfoSaneDefaults,
			}
		}
	}

	async completePrompt(prompt: string): Promise<string> {
		try {
			// kilocode_change: Ensure model ID is not empty to prevent malformed requests
			const model = this.getModel()
			if (!model.id || model.id.trim() === "") {
				throw new Error("LM Studio model ID is not configured. Please select a model in the settings.")
			}
			// kilocode_change end

			// Create params object with optional draft model
			const params: any = {
				model: model.id,
				messages: [{ role: "user", content: prompt }],
				temperature: this.options.modelTemperature ?? LMSTUDIO_DEFAULT_TEMPERATURE,
				stream: false,
			}

			// Add draft model if speculative decoding is enabled and a draft model is specified
			if (this.options.lmStudioSpeculativeDecodingEnabled && this.options.lmStudioDraftModelId) {
				params.draft_model = this.options.lmStudioDraftModelId
			}

			const response = await this.client.chat.completions.create(params)
			return response.choices[0]?.message.content || ""
		} catch (error) {
			throw new Error(
				"Please check the LM Studio developer logs to debug what went wrong. You may need to load the model with a larger context length to work with Kilo Code's prompts.",
			)
		}
	}
}

export async function getLmStudioModels(baseUrl = "http://localhost:1234") {
	try {
		if (!URL.canParse(baseUrl)) {
			return []
		}

		const response = await axios.get(`${baseUrl}/v1/models`)
		const modelsArray = response.data?.data?.map((model: any) => model.id) || []
		return [...new Set<string>(modelsArray)]
	} catch (error) {
		return []
	}
}
