import sax from "sax"
import { EventEmitter } from "events"
import { LLMParserConfig, StreamingParserOptions, LLMToolContext } from "./types.js"

/**
 * Error class for XML parsing errors
 */
export class XMLParsingError extends Error {
	public readonly tagName?: string
	public readonly data?: any

	constructor(message: string, tagName?: string, data?: any) {
		super(message)
		this.name = "XMLParsingError"
		this.tagName = tagName
		this.data = data
	}
}

interface TagStackItem {
	name: string
	data: Record<string, any>
	children: Record<string, any[]>
	attributes: Record<string, string>
}

/**
 * Events emitted by the StreamingXMLParser
 */
export interface StreamingParserEvents {
	/** Emitted when a complete tag has been parsed and validated */
	data: { type: string; data: any }
	/** Emitted when an error occurs during parsing or validation */
	error: { error: Error; tagName?: string; data?: any }
	/** Emitted when parsing is complete */
	complete: void
	/** Emitted when a tag starts */
	tagStart: { tagName: string; attributes: Record<string, string> }
	/** Emitted when a tag ends */
	tagEnd: { tagName: string; data: any }
}

/**
 * A streaming XML parser for LLM responses.
 *
 * This class parses XML from LLM responses in a streaming fashion,
 * validating the data against schemas and emitting events for
 * parsed tags.
 */
export class StreamingXMLParser extends EventEmitter {
	private parser: sax.SAXStream
	private tagStack: TagStackItem[] = []
	private currentText = ""
	private config: LLMParserConfig
	private options: StreamingParserOptions
	private isActive = false
	private startTime?: number

	/**
	 * Create a new StreamingXMLParser.
	 *
	 * @param config The parser configuration with tag handlers
	 * @param options Options for the SAX parser
	 */
	constructor(config: LLMParserConfig, options: StreamingParserOptions = {}) {
		super()
		this.config = config
		this.options = {
			lowercase: true,
			normalize: true,
			xmlns: false,
			position: false,
			strictMode: false,
			...options,
		}

		this.parser = sax.createStream(this.options.strictMode, {
			lowercase: this.options.lowercase,
			normalize: this.options.normalize,
			xmlns: this.options.xmlns,
			position: this.options.position,
		})

		this.setupEventHandlers()
	}

	/**
	 * Set up event handlers for the SAX parser.
	 * This method configures the event handlers for the SAX parser
	 * to handle tag opening, text content, and tag closing.
	 *
	 * @private
	 */
	private setupEventHandlers(): void {
		this.parser.on("opentag", (tag: any) => {
			const tagItem: TagStackItem = {
				name: tag.name,
				data: {},
				children: {},
				attributes: tag.attributes || {},
			}

			this.tagStack.push(tagItem)
			this.currentText = ""

			this.emit("tagStart", { tagName: tag.name, attributes: tagItem.attributes })
		})

		this.parser.on("text", (text: string) => {
			this.currentText += text.trim()
		})

		this.parser.on("closetag", async (tagName: string) => {
			const currentTag = this.tagStack.pop()
			if (!currentTag) return

			// Store text content if present
			if (this.currentText) {
				const parentTag = this.tagStack[this.tagStack.length - 1]
				if (parentTag) {
					// Add to parent's children array
					if (!parentTag.children[tagName]) {
						parentTag.children[tagName] = []
					}
					parentTag.children[tagName].push(this.currentText)

					// Also store as direct property for easier access
					parentTag.data[tagName] = this.currentText
				}
			}

			// Merge attributes into data
			currentTag.data = { ...currentTag.attributes, ...currentTag.data }

			this.emit("tagEnd", { tagName, data: currentTag.data })

			// Handle configured tag types when they complete
			if (this.config[tagName]) {
				await this.handleCompletedTag(tagName, currentTag)
			}

			this.currentText = ""
		})

		this.parser.on("error", (error: Error) => {
			this.emit("error", { error })
		})

		this.parser.on("end", () => {
			this.isActive = false
			const duration = this.startTime ? Date.now() - this.startTime : 0
			this.emit("complete", undefined)
		})
	}

	/**
	 * Handle a completed tag.
	 * This method processes a completed tag by validating its data against
	 * the configured schema and calling the handler callback.
	 *
	 * @param tagName The name of the tag
	 * @param tagData The data for the tag
	 * @private
	 */
	private async handleCompletedTag(tagName: string, tagData: TagStackItem): Promise<void> {
		const handler = this.config[tagName]
		if (!handler) return

		try {
			// Flatten the tag data for validation
			const flatData = { ...tagData.data }

			// Handle child elements
			Object.keys(tagData.children).forEach((childName) => {
				const childArray = tagData.children[childName]
				// Convert single-item arrays to single values (common XML pattern)
				const value = childArray.length === 1 ? childArray[0] : childArray

				// Try to convert numeric strings to numbers
				if (typeof value === "string") {
					// Check if it's a number
					if (/^-?\d+(\.\d+)?$/.test(value.trim())) {
						flatData[childName] = Number(value)
					} else {
						flatData[childName] = value
					}
				} else {
					flatData[childName] = value
				}
			})

			const validatedData = handler.schema.parse(flatData)
			await handler.callback(validatedData, tagName, {})

			this.emit("data", { type: tagName, data: validatedData })
		} catch (error) {
			// Create a more specific error with context
			const parseError =
				error instanceof Error
					? new XMLParsingError(error.message, tagName, tagData.data)
					: new XMLParsingError(String(error), tagName, tagData.data)

			this.emit("error", {
				error: parseError,
				tagName,
				data: tagData.data,
			})
		}
	}

	/**
	 * Public interface methods for LLM response processing
	 */

	/**
	 * Write a chunk of XML to the parser.
	 * This method writes a chunk of XML to the parser for processing.
	 *
	 * @param chunk The chunk of XML to write
	 */
	write(chunk: string): void {
		if (!this.isActive) {
			this.isActive = true
			this.startTime = Date.now()
		}
		this.parser.write(chunk)
	}

	/**
	 * End the parsing process.
	 * This method signals the end of the XML input.
	 */
	end(): void {
		this.parser.end()
	}

	/**
	 * Destroy the parser and clean up resources.
	 * This method cleans up resources used by the parser.
	 */
	destroy(): void {
		// Close the parser if it exists
		if (this.parser) {
			// The sax parser doesn't have a destroy method, but it has an end method
			// that we can call to ensure it's properly closed
			this.parser.end()
		}
		this.removeAllListeners()
	}

	/**
	 * Utility methods for LLM response parsing
	 */

	/**
	 * Parse a complete XML string.
	 * This method parses a complete XML string and returns the results.
	 *
	 * @param xmlString The XML string to parse
	 * @returns A promise that resolves to an array of parsed results
	 */
	async parseComplete(xmlString: string): Promise<Array<{ type: string; data: any }>> {
		const results: Array<{ type: string; data: any }> = []
		const errors: Error[] = []

		return new Promise<Array<{ type: string; data: any }>>((resolve, reject) => {
			this.on("data", (result) => results.push(result))
			this.on("error", ({ error }) => errors.push(error))
			this.on("complete", () => {
				if (errors.length > 0) {
					reject(new Error(`LLM response parsing errors: ${errors.map((e) => e.message).join(", ")}`))
				} else {
					resolve(results)
				}
			})

			this.write(xmlString)
			this.end()
		})
	}

	/**
	 * Parse a stream of XML chunks.
	 * This method parses a stream of XML chunks and yields the results.
	 *
	 * @param stream The stream of XML chunks to parse
	 * @returns An async generator that yields parsed results
	 */
	async *parseStream(stream: AsyncIterable<string>): AsyncGenerator<{ type: string; data: any }> {
		const results: Array<{ type: string; data: any }> = []
		let hasError = false
		let errorDetails: Error | null = null

		this.on("data", (result) => results.push(result))
		this.on("error", ({ error }) => {
			hasError = true
			errorDetails = error
		})

		try {
			for await (const chunk of stream) {
				this.write(chunk)

				// Yield any new results
				while (results.length > 0) {
					yield results.shift()!
				}

				if (hasError) {
					throw errorDetails || new Error("Unknown LLM response parsing error")
				}
			}

			this.end()

			// Yield any remaining results
			while (results.length > 0) {
				yield results.shift()!
			}
		} finally {
			this.destroy()
		}
	}

	/**
	 * Configuration management for LLM tools
	 */

	/**
	 * Update the parser configuration.
	 * This method updates the parser configuration with new tag handlers.
	 *
	 * @param newConfig The new parser configuration
	 */
	updateConfig(newConfig: LLMParserConfig): void {
		this.config = { ...this.config, ...newConfig }
	}

	/**
	 * Get the current parser configuration.
	 * This method returns the current parser configuration.
	 *
	 * @returns The current parser configuration
	 */
	getConfig(): LLMParserConfig {
		return { ...this.config }
	}
}

// Type-safe event emitter interface
export interface StreamingXMLParser {
	on<K extends keyof StreamingParserEvents>(event: K, listener: (arg: StreamingParserEvents[K]) => void): this
	emit<K extends keyof StreamingParserEvents>(event: K, arg: StreamingParserEvents[K]): boolean
}
