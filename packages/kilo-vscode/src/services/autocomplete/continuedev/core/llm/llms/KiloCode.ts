import { ChatMessage, CompletionOptions, LLMOptions } from "../../index.js"
import OpenRouter from "./OpenRouter"

const KILO_GATEWAY_BASE_URL = "https://openrouter.kilo.ai/api/v1/"
const EXTENSION_VERSION = "0.0.1" // TODO: read from package.json if needed

/**
 * Extended CompletionOptions to include KiloCode-specific per-request metadata
 */
export interface KiloCodeCompletionOptions extends CompletionOptions {
  kilocodeTaskId?: string
  kilocodeProjectId?: string
}

/**
 * KiloCode LLM provider that extends OpenRouter with KiloCode-specific features:
 * - Custom base URL for Kilo Gateway
 * - KiloCode-specific headers (version)
 *
 * Note: FIM is not supported — AutocompleteModel.supportsFim() returns false.
 * This adapter is used only for the holefiller chat completions path.
 */
class KiloCode extends OpenRouter {
  static override providerName = "kilocode"

  // Instance variables to store per-request metadata
  private currentTaskId?: string
  private currentProjectId?: string

  constructor(options: LLMOptions) {
    // Transform apiBase to use KiloCode Gateway
    const transformedOptions = {
      ...options,
      apiBase: KILO_GATEWAY_BASE_URL,
    }

    super(transformedOptions)
  }

  /**
   * Override _streamChat to extract per-request metadata from options
   */
  protected override async *_streamChat(
    messages: ChatMessage[],
    signal: AbortSignal,
    options: CompletionOptions,
  ): AsyncGenerator<ChatMessage> {
    const kilocodeOptions = options as KiloCodeCompletionOptions
    this.currentTaskId = kilocodeOptions.kilocodeTaskId
    this.currentProjectId = kilocodeOptions.kilocodeProjectId

    try {
      yield* super._streamChat(messages, signal, options)
    } finally {
      this.currentTaskId = undefined
      this.currentProjectId = undefined
    }
  }

  /**
   * Override _streamComplete to support per-request metadata
   */
  protected override async *_streamComplete(
    prompt: string,
    signal: AbortSignal,
    options: CompletionOptions,
  ): AsyncGenerator<string> {
    const kilocodeOptions = options as KiloCodeCompletionOptions
    this.currentTaskId = kilocodeOptions.kilocodeTaskId
    this.currentProjectId = kilocodeOptions.kilocodeProjectId

    try {
      yield* super._streamComplete(prompt, signal, options)
    } finally {
      this.currentTaskId = undefined
      this.currentProjectId = undefined
    }
  }

  /**
   * FIM is not supported — throws if called.
   */
  protected override async *_streamFim(
    _prefix: string,
    _suffix: string,
    _signal: AbortSignal,
    _options: CompletionOptions,
  ): AsyncGenerator<string> {
    throw new Error("FIM is not supported on KiloCode adapter. Use holefiller via chat completion instead.")
  }

  /**
   * Override _getHeaders to inject KiloCode-specific headers
   */
  protected override _getHeaders() {
    const baseHeaders = super._getHeaders()

    return {
      ...baseHeaders,
      "X-KiloCode-Version": EXTENSION_VERSION,
    }
  }

  override supportsFim(): boolean {
    return false
  }
}

export default KiloCode
