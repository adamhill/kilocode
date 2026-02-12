// kilocode_change - rewritten to hardcode Kilo Gateway + codestral-2508
import * as vscode from "vscode"
import { ResponseMetaData } from "./types"
import { streamSse } from "./continuedev/core/fetch/stream"

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
  public profileName: string | null = null
  public profileType: string | null = null
  public loaded = false
  public hasKilocodeProfileWithNoBalance = false

  constructor(apiKey?: string) {
    if (apiKey) {
      this.apiKey = apiKey
      this.loaded = true
    }
  }

  private cleanup(): void {
    this.apiKey = null
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
   */
  public async generateResponse(
    systemPrompt: string,
    userPrompt: string,
    onChunk: (chunk: ApiStreamChunk) => void,
  ): Promise<ResponseMetaData> {
    if (!this.apiKey) {
      console.error("[Kilo New] API key is not configured")
      throw new Error("API key is not configured. Please set kilo-code.new.autocomplete.apiKey in settings.")
    }

    const model = DEFAULT_MODEL

    console.log("[Kilo New] Autocomplete request to", model)

    const body = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
      max_tokens: 1024,
      temperature: 0.2,
    }

    const endpoint = new URL("chat/completions", KILO_GATEWAY_BASE_URL)
    const response = await fetch(endpoint.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown error")
      throw new Error(`Kilo Gateway request failed (${response.status}): ${errorText}`)
    }

    let cost = 0
    let inputTokens = 0
    let outputTokens = 0
    let cacheReadTokens = 0
    let cacheWriteTokens = 0

    for await (const value of streamSse(response)) {
      if (value.choices?.[0]?.delta?.content) {
        const text = value.choices[0].delta.content as string
        onChunk({ type: "text", text })
      }

      // Track usage from the final chunk if present
      if (value.usage) {
        inputTokens = value.usage.prompt_tokens ?? 0
        outputTokens = value.usage.completion_tokens ?? 0
        cacheReadTokens = value.usage.prompt_tokens_details?.cached_tokens ?? 0
      }

      if (value.x_kilocode) {
        cost = value.x_kilocode.total_cost ?? 0
      }
    }

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
