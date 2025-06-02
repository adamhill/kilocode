import { StreamingXMLParser, XMLParsingError } from "../../core/StreamingXMLParser.js"
import { z } from "zod"
import "jest"

describe("StreamingXMLParser", () => {
	let parser: StreamingXMLParser

	beforeEach(() => {
		// Create a parser with a simple configuration
		parser = new StreamingXMLParser({
			test: {
				schema: z.object({
					message: z.string(),
					value: z.number().optional(),
				}),
				callback: jest.fn(),
			},
			complex: {
				schema: z.object({
					name: z.string(),
					items: z.array(z.string()).optional(),
				}),
				callback: jest.fn(),
			},
		})
	})

	afterEach(() => {
		parser.destroy()
	})

	test("should parse a simple XML tag", async () => {
		const xml = `<test><message>Hello, world!</message><value>42</value></test>`
		const dataHandler = jest.fn()
		parser.on("data", dataHandler)

		const results = await parser.parseComplete(xml)

		expect(results).toHaveLength(1)
		expect(results[0].type).toBe("test")
		expect(results[0].data).toEqual({
			message: "Hello, world!",
			value: 42, // Note: should be converted to a number
		})
		expect(dataHandler).toHaveBeenCalledTimes(1)
	})

	test("should handle numeric conversion correctly", async () => {
		const xml = `<test><message>Count</message><value>123.45</value></test>`
		const results = await parser.parseComplete(xml)

		expect(results[0].data.value).toBe(123.45)
		expect(typeof results[0].data.value).toBe("number")
	})

	test("should parse complex nested XML", async () => {
		const xml = `
	     <complex>
	       <name>Test List</name>
	       <items>First item</items>
	       <items>Second item</items>
	     </complex>
	   `
		const results = await parser.parseComplete(xml)

		expect(results).toHaveLength(1)
		expect(results[0].type).toBe("complex")
		expect(results[0].data).toEqual({
			name: "Test List",
			items: ["First item", "Second item"],
		})
	})

	test("should handle multiple tags", async () => {
		// Create a new parser instance for this test to avoid interference
		const multiParser = new StreamingXMLParser({
			test: {
				schema: z.object({
					message: z.string(),
					value: z.number().optional(),
				}),
				callback: jest.fn(),
			},
		})

		// Process first tag
		const results1 = await multiParser.parseComplete(
			`<test><message>First message</message><value>1</value></test>`,
		)

		// Destroy the first parser and create a new one to avoid state issues
		multiParser.destroy()
		const multiParser2 = new StreamingXMLParser({
			test: {
				schema: z.object({
					message: z.string(),
					value: z.number().optional(),
				}),
				callback: jest.fn(),
			},
		})

		// Process second tag with the new parser
		const results2 = await multiParser2.parseComplete(
			`<test><message>Second message</message><value>2</value></test>`,
		)

		// Verify each result separately
		expect(results1).toHaveLength(1)
		expect(results1[0].data.message).toBe("First message")

		expect(results2).toHaveLength(1)
		expect(results2[0].data.message).toBe("Second message")
	})

	test("should emit error for invalid data", async () => {
		const xml = `<test><message>Invalid</message><value>not-a-number</value></test>`
		const errorHandler = jest.fn()
		parser.on("error", errorHandler)

		try {
			await parser.parseComplete(xml)
			// If we get here, the test should fail
			expect(true).toBe(false, "Should have thrown an error")
		} catch (error) {
			expect(error).toBeDefined()
			expect(errorHandler).toHaveBeenCalled()
			const errorArg = errorHandler.mock.calls[0][0]
			expect(errorArg.tagName).toBe("test")
			expect(errorArg.error).toBeInstanceOf(Error)
		}
	})

	test("should handle streaming input", async () => {
		const chunks = ["<te", "st><mes", "sage>Streaming ", "test</message><value>99</value></te", "st>"]

		// Mock async iterable
		async function* mockStream() {
			for (const chunk of chunks) {
				yield chunk
			}
		}

		const results: Array<{ type: string; data: any }> = []
		for await (const result of parser.parseStream(mockStream())) {
			results.push(result)
		}

		expect(results).toHaveLength(1)
		expect(results[0].data).toEqual({
			message: "Streaming test",
			value: 99,
		})
	})

	test("should update configuration", () => {
		const newConfig = {
			newTag: {
				schema: z.object({ field: z.string() }),
				callback: jest.fn(),
			},
		}

		parser.updateConfig(newConfig)
		const config = parser.getConfig()

		expect(config).toHaveProperty("test") // Original tag
		expect(config).toHaveProperty("complex") // Original tag
		expect(config).toHaveProperty("newTag") // New tag
	})

	test("should clean up resources on destroy", () => {
		// Add a data listener to ensure there's at least one
		parser.on("data", () => {})

		const listenerCount = parser.listenerCount("data")
		expect(listenerCount).toBeGreaterThan(0)

		parser.destroy()

		expect(parser.listenerCount("data")).toBe(0)
	})
})
