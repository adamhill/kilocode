import { ApiHandlerOptions, ModelRecord } from "../../shared/api"
import { OpenRouterHandler } from "./openrouter"
import { getModelParams } from "../transform/model-params"
import { getModels } from "./fetchers/modelCache"
import { DEEP_SEEK_DEFAULT_TEMPERATURE, kilocodeDefaultModelId } from "@roo-code/types"
import { getKiloBaseUriFromToken } from "../../utils/kilocode-token"
import { ApiHandlerCreateMessageMetadata } from ".."
import OpenAI from "openai"
import { getModelEndpoints } from "./fetchers/modelEndpointCache"

/**
 * A custom OpenRouter handler that overrides the getModel function
 * to provide custom model information and fetches models from the KiloCode OpenRouter endpoint.
 */
export class KilocodeOpenrouterHandler extends OpenRouterHandler {
	protected override models: ModelRecord = {}

	constructor(options: ApiHandlerOptions) {
		const baseUri = getKiloBaseUri(options)
		options = {
			...options,
			openRouterBaseUrl: `${baseUri}/api/openrouter/`,
			openRouterApiKey: options.kilocodeToken,
		}

		super(options)
	}

	override customRequestOptions(metadata?: ApiHandlerCreateMessageMetadata): OpenAI.RequestOptions | undefined {
		return metadata
			? {
					headers: {
						"X-KiloCode-TaskId": metadata.taskId,
					},
				}
			: undefined
	}

	override getModel() {
		let id
		let info
		let defaultTemperature = 0

		const selectedModel = this.options.kilocodeModel ?? kilocodeDefaultModelId

		// Map the selected model to the corresponding OpenRouter model ID
		// legacy mapping
		const modelMapping = {
			gemini25: "google/gemini-2.5-pro-preview",
			gpt41: "openai/gpt-4.1",
			gemini25flashpreview: "google/gemini-2.5-flash-preview",
			claude37: "anthropic/claude-3.7-sonnet",
		}

		// check if the selected model is in the mapping for backwards compatibility
		id = selectedModel
		if (Object.keys(modelMapping).includes(selectedModel)) {
			id = modelMapping[selectedModel as keyof typeof modelMapping]
		}

		if (Object.keys(this.models).length === 0) {
			throw new Error("Failed to load Kilo Code provider model list.")
		} else if (this.models[id]) {
			info = this.models[id]
		} else {
			throw new Error(`Unsupported model: ${selectedModel}`)
		}

		// If a specific provider is requested, use the endpoint for that provider.
		if (this.options.openRouterSpecificProvider && this.endpoints[this.options.openRouterSpecificProvider]) {
			info = this.endpoints[this.options.openRouterSpecificProvider]
		}

		const isDeepSeekR1 = id.startsWith("deepseek/deepseek-r1") || id === "perplexity/sonar-reasoning"

		const params = getModelParams({
			format: "openrouter",
			modelId: id,
			model: info,
			settings: this.options,
			defaultTemperature: isDeepSeekR1 ? DEEP_SEEK_DEFAULT_TEMPERATURE : defaultTemperature,
		})

		return { id, info, topP: isDeepSeekR1 ? 0.95 : undefined, ...params }
	}

	public override async fetchModel() {
		if (!this.options.kilocodeToken || !this.options.openRouterBaseUrl) {
			throw new Error("KiloCode token + baseUrl is required to fetch models")
		}

		const [models, endpoints] = await Promise.all([
			getModels({
				provider: "kilocode-openrouter",
				kilocodeToken: this.options.kilocodeToken,
			}),
			getModelEndpoints({
				router: "openrouter",
				modelId: this.options.kilocodeModel,
				endpoint: this.options.openRouterSpecificProvider,
			}),
		])

		this.models = models
		this.endpoints = endpoints
		return this.getModel()
	}
}

function getKiloBaseUri(options: ApiHandlerOptions) {
	return getKiloBaseUriFromToken(options.kilocodeToken ?? "")
}
