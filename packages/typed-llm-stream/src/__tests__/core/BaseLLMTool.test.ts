import { BaseLLMTool } from "../../core/BaseLLMTool.js"
import { z } from "zod"
import { LLMToolContext, LLMPromptSection } from "../../core/types.js"

// Add Jest types
declare global {
	namespace jest {
		interface Matchers<R> {
			toBeInstanceOf(expected: any): R
		}
	}
}

// Create a simple test tool that extends BaseLLMTool
class TestTool extends BaseLLMTool {
	public testData: any = null

	constructor() {
		super({
			id: "test-tool",
			name: "Test Tool",
			description: "A tool for testing",
			schema: z.object({
				message: z.string(),
				value: z.number().optional(),
			}),
			xmlTag: "test",
		})
	}

	generatePromptSection(context: LLMToolContext): LLMPromptSection {
		return this.createPromptSection(`This is a test prompt with context: ${JSON.stringify(context)}`, 1)
	}

	async handleResponse(data: z.infer<typeof this.schema>, context: LLMToolContext): Promise<void> {
		this.testData = { ...data, context }
	}

	// Expose protected methods for testing
	public testBuildXMLPromptSection(
		title: string,
		xmlStructure: string,
		instructions: string[],
		order: number = 0,
	): LLMPromptSection {
		return this.buildXMLPromptSection(title, xmlStructure, instructions, order)
	}

	public testBuildNestedXMLStructure(tagName: string, fields: Record<string, string | string[]>): string {
		return this.buildNestedXMLStructure(tagName, fields)
	}

	public testGetContextualInstructions(context: LLMToolContext, baseInstructions: string[]): string[] {
		return this.getContextualInstructions(context, baseInstructions)
	}
}

describe("BaseLLMTool", () => {
	let testTool: TestTool

	beforeEach(() => {
		testTool = new TestTool()
	})

	test("should initialize with correct properties", () => {
		expect(testTool.id).toBe("test-tool")
		expect(testTool.name).toBe("Test Tool")
		expect(testTool.description).toBe("A tool for testing")
		expect(testTool.xmlTag).toBe("test")
		expect(testTool.enabled).toBe(true)
	})

	test("should generate prompt section", () => {
		const context = { user: "test-user" }
		const section = testTool.generatePromptSection(context)

		expect(section.id).toBe("test-tool")
		expect(section.title).toBe("Test Tool")
		expect(section.content).toContain("test-user")
		expect(section.order).toBe(1)
	})

	test("should validate response data", () => {
		const validData = { message: "Hello" }
		const result = testTool.validateResponse(validData)

		expect(result).toEqual(validData)
	})

	test("should throw error for invalid data", () => {
		const invalidData = { wrongField: "test" }

		expect(() => {
			testTool.validateResponse(invalidData)
		}).toThrow()
	})

	test("should handle response data", async () => {
		const data = { message: "Test message", value: 42 }
		const context = { user: "test-user" }

		await testTool.handleResponse(data, context)

		expect(testTool.testData).toEqual({
			message: "Test message",
			value: 42,
			context: { user: "test-user" },
		})
	})

	test("should enable and disable tool", () => {
		expect(testTool.enabled).toBe(true)

		testTool.disable()
		expect(testTool.enabled).toBe(false)

		testTool.enable()
		expect(testTool.enabled).toBe(true)
	})

	test("should clone tool", () => {
		const clonedTool = testTool.clone()

		expect(clonedTool).toBeInstanceOf(TestTool)
		expect(clonedTool.id).toBe(testTool.id)
		expect(clonedTool.name).toBe(testTool.name)
		expect(clonedTool.description).toBe(testTool.description)
		expect(clonedTool.xmlTag).toBe(testTool.xmlTag)
		expect(clonedTool.enabled).toBe(testTool.enabled)

		// Ensure it's a deep clone
		testTool.disable()
		expect(clonedTool.enabled).toBe(true)
	})

	test("should build XML prompt section", () => {
		const section = testTool.testBuildXMLPromptSection(
			"Test Title",
			"<test><message>test</message></test>",
			["Instruction 1", "Instruction 2"],
			2,
		)

		expect(section.id).toBe("test-tool")
		expect(section.title).toBe("Test Tool")
		expect(section.content).toContain("Test Title")
		expect(section.content).toContain("<test><message>test</message></test>")
		expect(section.content).toContain("- Instruction 1")
		expect(section.content).toContain("- Instruction 2")
		expect(section.order).toBe(2)
	})

	test("should build nested XML structure", () => {
		const xml = testTool.testBuildNestedXMLStructure("test", {
			message: "Hello",
			options: ["option1", "option2", "option3"],
		})

		expect(xml).toContain("<test>")
		expect(xml).toContain("</test>")
		expect(xml).toContain("<message>Hello</message>")
		expect(xml).toContain("<options>option1</options>")
		expect(xml).toContain("<!-- options: option1 | option2 | option3 -->")
	})

	test("should get contextual instructions", () => {
		const baseInstructions = ["Base instruction 1", "Base instruction 2"]
		const context = {
			currentFile: "test.ts",
			recentActivity: ["activity1", "activity2"],
			llmModel: "gpt-4",
		}

		const instructions = testTool.testGetContextualInstructions(context, baseInstructions)

		expect(instructions).toContain("Base instruction 1")
		expect(instructions).toContain("Base instruction 2")
		expect(instructions).toContain("Current file context: test.ts")
		expect(instructions).toContain("Consider recent activity patterns in your LLM response")
		expect(instructions).toContain("Optimize response for gpt-4 capabilities")
	})
})
