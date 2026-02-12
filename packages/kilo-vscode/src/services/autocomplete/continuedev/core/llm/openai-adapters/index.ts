import dotenv from "dotenv"
import { z } from "zod"
import { MockApi } from "./apis/Mock.js"
import { OpenAIApi } from "./apis/OpenAI.js"
import { OpenRouterApi } from "./apis/OpenRouter.js"
import { BaseLlmApi } from "./apis/base.js"
import { LLMConfig, OpenAIConfigSchema } from "./types.js"

dotenv.config()

function openAICompatible(apiBase: string, config: z.infer<typeof OpenAIConfigSchema>): OpenAIApi {
  return new OpenAIApi({
    ...config,
    apiBase: config.apiBase ?? apiBase,
  })
}

export function constructLlmApi(config: LLMConfig): BaseLlmApi | undefined {
  switch (config.provider) {
    case "openai":
      return new OpenAIApi(config)
    case "openrouter":
      return new OpenRouterApi(config)
    case "mock":
      return new MockApi()
    default: {
      // Fall back to OpenAI-compatible for any provider with a custom apiBase
      const fallback = config as z.infer<typeof OpenAIConfigSchema>
      if (fallback.apiBase) {
        return openAICompatible(fallback.apiBase, fallback)
      }
      return undefined
    }
  }
}

// export
export type { BaseLlmApi } from "./apis/base.js"
