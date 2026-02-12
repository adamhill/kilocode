// kilocode_change - rewritten to hardcode Kilo Gateway + codestral-2508
import * as vscode from "vscode"
import OpenAI from "openai"
import { ResponseMetaData } from "./types"

const KILO_GATEWAY_BASE_URL = "https://openrouter.kilo.ai/api/v1/"
const DEFAULT_MODEL = "mistralai/codestral-2508"
const PROVIDER_DISPLAY_NAME = "Kilo Gateway"

/** Chunk from an LLM streaming response */
export type ApiStreamChunk =
  | { type: "text"; text: string }
  | {
      type: "usage"
      totalCost?: number
      inputTokens?: number
      outputTokens?: number
      cacheReadTokens?: number
      cacheWriteTokens?: number
    }

export class AutocompleteModel {
  private apiKey: string | null = null
  private client: OpenAI | null = null
  public profileName: string | null = null
  public profileType: string | null = null
  public loaded = false
  public hasKilocodeProfileWithNoBalance = false

  constructor(apiKey?: string) {
    if (apiKey) {
      this.apiKey = apiKey
      this.client = new OpenAI({ apiKey, baseURL: KILO_GATEWAY_BASE_URL })
      this.loaded = true
    }
  }

  private cleanup(): void {
    this.apiKey = null
    this.client = null
    this.profileName = null
    this.profileType = null
    this.loaded = false
    this.hasKilocodeProfileWithNoBalance = false
  }

  /**
   * Load the API key from VS Code settings.
   * Returns true if a usable key was found.
   */
  public async reload(): Promise<boolean> {
    this.cleanup()

    const config = vscode.workspace.getConfiguration("kilo-code.new.autocomplete")
    const key = config.get<string>("apiKey")

    if (key) {
      this.apiKey = key
      this.client = new OpenAI({ apiKey: key, baseURL: KILO_GATEWAY_BASE_URL })
      this.loaded = true
      console.log(
        `[Kilo New] AutocompleteModel.reload(): API key found, model=${DEFAULT_MODEL}, provider=${PROVIDER_DISPLAY_NAME}`,
      )
      return true
    }

    this.loaded = true // loaded but no key
    console.warn("[Kilo New] AutocompleteModel.reload(): No API key configured (kilo-code.new.autocomplete.apiKey)")
    return false
  }

  public supportsFim(): boolean {
    return false
  }

  /**
   * FIM is not supported — throws if called.
   */
  public async generateFimResponse(
    _prefix: string,
    _suffix: string,
    _onChunk: (text: string) => void,
    _taskId?: string,
  ): Promise<ResponseMetaData> {
    throw new Error("FIM is not supported. Use holefiller via generateResponse() instead.")
  }

  /**
   * Generate response with streaming callback support via Kilo Gateway OpenAI-compatible endpoint.
   * Uses the openai npm package for reliable streaming in the VS Code Electron environment.
   */
  public async generateResponse(
    systemPrompt: string,
    userPrompt: string,
    onChunk: (chunk: ApiStreamChunk) => void,
  ): Promise<ResponseMetaData> {
    console.log("[Kilo New] AutocompleteModel.generateResponse: ENTERED", {
      hasApiKey: !!this.apiKey,
      hasClient: !!this.client,
      systemPromptLen: systemPrompt.length,
      userPromptLen: userPrompt.length,
    })

    if (!this.apiKey || !this.client) {
      console.error("[Kilo New] AutocompleteModel.generateResponse: NO API KEY or CLIENT", {
        hasApiKey: !!this.apiKey,
        hasClient: !!this.client,
      })
      throw new Error("API key is not configured. Please set kilo-code.new.autocomplete.apiKey in settings.")
    }

    const model = DEFAULT_MODEL

    console.log("[Kilo New] AutocompleteModel.generateResponse: creating stream", {
      model,
      baseURL: KILO_GATEWAY_BASE_URL,
      maxTokens: 1024,
      temperature: 0.2,
    })

    let cost = 0
    let inputTokens = 0
    let outputTokens = 0
    let cacheReadTokens = 0
    let cacheWriteTokens = 0

    let stream: Awaited<ReturnType<typeof this.client.chat.completions.create>>
    try {
      stream = await this.client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
        stream_options: { include_usage: true },
        max_tokens: 1024,
        temperature: 0.2,
      })
      console.log("[Kilo New] AutocompleteModel.generateResponse: stream created successfully")
    } catch (error) {
      const err = error as Record<string, unknown>
      console.error("[Kilo New] AutocompleteModel.generateResponse: STREAM CREATION FAILED", {
        message: err.message,
        status: err.status,
        code: err.code,
        type: err.type,
        error: String(error),
      })
      throw error
    }

    let chunks = 0

    try {
      for await (const chunk of stream) {
        const content = chunk.choices?.[0]?.delta?.content
        if (content) {
          onChunk({ type: "text", text: content })
          chunks++
          if (chunks <= 3) {
            console.log(
              `[Kilo New] AutocompleteModel.generateResponse: text chunk #${chunks}: "${content.slice(0, 50)}"`,
            )
          }
        }

        // Track usage from the final chunk (has usage when stream_options.include_usage is true)
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens ?? 0
          outputTokens = chunk.usage.completion_tokens ?? 0
          const usage = chunk.usage as unknown as Record<string, unknown>
          const details = usage.prompt_tokens_details as Record<string, number> | undefined
          cacheReadTokens = details?.cached_tokens ?? 0
        }

        // Extract cost from kilocode-specific extension
        const extra = chunk as unknown as Record<string, unknown>
        if (extra.x_kilocode) {
          cost = (extra.x_kilocode as Record<string, number>).total_cost ?? 0
        }
      }
    } catch (error) {
      const err = error as Record<string, unknown>
      console.error("[Kilo New] AutocompleteModel.generateResponse: STREAM ITERATION FAILED", {
        chunksBeforeError: chunks,
        message: err.message,
        status: err.status,
        code: err.code,
        error: String(error),
      })
      throw error
    }

    console.log(`[Kilo New] AutocompleteModel.generateResponse: stream complete`, {
      textChunks: chunks,
      inputTokens,
      outputTokens,
      cost,
      cacheReadTokens,
    })

    const usageChunk: ApiStreamChunk = {
      type: "usage",
      totalCost: cost,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
    }
    onChunk(usageChunk)

    return {
      cost,
      inputTokens,
      outputTokens,
      cacheWriteTokens,
      cacheReadTokens,
    }
  }

  public getModelName(): string {
    return DEFAULT_MODEL
  }

  public getProviderDisplayName(): string {
    return PROVIDER_DISPLAY_NAME
  }

  public hasValidCredentials(): boolean {
    return this.apiKey !== null && this.loaded
  }
}
