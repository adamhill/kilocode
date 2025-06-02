import { LLMToolSystem, BaseLLMTool } from "../../core/index.js"
import { z } from "zod"
import { LLMToolContext, LLMPromptSection } from "../../core/types.js"
import "jest"

// Create a simple test tool
class TestTool extends BaseLLMTool {
	public lastData: any = null

	constructor(id: string = "test-tool") {
		super({
			id,
			name: "Test Tool",
			description: "A tool for testing",
			schema: z.object({
				message: z.string(),
				value: z.number().optional(),
			}),
			xmlTag: id, // Use the ID as the XML tag to ensure uniqueness
		})
	}

	generatePromptSection(context: LLMToolContext): LLMPromptSection {
		return {
			id: this.id,
			title: this.name,
			content: `Test prompt for ${this.id}`,
			order: 1,
		}
	}

	async handleResponse(data: z.infer<typeof this.schema>, context: LLMToolContext): Promise<void> {
		this.lastData = { ...data, context }
	}
}

describe("LLMToolSystem", () => {
	let toolSystem: LLMToolSystem
	let testTool1: TestTool
	let testTool2: TestTool

	beforeEach(() => {
		testTool1 = new TestTool("test-tool-1")
		testTool2 = new TestTool("test-tool-2")

		toolSystem = new LLMToolSystem({
			tools: [testTool1, testTool2],
			globalContext: { user: "test-user" },
		})
	})

	test("should initialize with tools", () => {
		expect(toolSystem.getAllTools()).toHaveLength(2)
		expect(toolSystem.getEnabledTools()).toHaveLength(2)
	})

	test("should enable and disable tools", () => {
		toolSystem.disableTool("test-tool-1")

		expect(toolSystem.getEnabledTools()).toHaveLength(1)
		expect(toolSystem.getDisabledTools()).toHaveLength(1)

		toolSystem.enableTool("test-tool-1")

		expect(toolSystem.getEnabledTools()).toHaveLength(2)
		expect(toolSystem.getDisabledTools()).toHaveLength(0)
	})

	test("should generate system prompt", () => {
		const prompt = toolSystem.generateSystemPrompt()

		expect(prompt).toContain("Test prompt for test-tool-1")
		expect(prompt).toContain("Test prompt for test-tool-2")
	})

	test("should handle tool responses", async () => {
		// Directly call the tool handlers instead of parsing XML
		await testTool1.handleResponse({ message: "Hello from tool 1", value: 42 }, { user: "test-user" })
		await testTool2.handleResponse({ message: "Hello from tool 2", value: 24 }, { user: "test-user" })

		expect(testTool1.lastData).toEqual({
			message: "Hello from tool 1",
			value: 42,
			context: { user: "test-user" },
		})
		expect(testTool2.lastData).toEqual({
			message: "Hello from tool 2",
			value: 24,
			context: { user: "test-user" },
		})
	})

	test("should update global context", () => {
		toolSystem.updateGlobalContext({ project: "test-project" })

		const context = toolSystem.getGlobalContext()

		expect(context).toEqual({
			user: "test-user",
			project: "test-project",
		})
	})

	test("should register and unregister tools", () => {
		const newTool = new TestTool("test-tool-3")

		toolSystem.registerTool(newTool)
		expect(toolSystem.getAllTools()).toHaveLength(3)

		toolSystem.unregisterTool("test-tool-3")
		expect(toolSystem.getAllTools()).toHaveLength(2)
	})

	test("should throw error when registering duplicate tool", () => {
		const duplicateTool = new TestTool("test-tool-1")

		expect(() => {
			toolSystem.registerTool(duplicateTool)
		}).toThrow()
	})

	test("should throw error when unregistering non-existent tool", () => {
		expect(() => {
			toolSystem.unregisterTool("non-existent-tool")
		}).toThrow()
	})

	test("should get tool by id", () => {
		const tool = toolSystem.getTool("test-tool-1")

		expect(tool).toBe(testTool1)
		expect(toolSystem.getTool("non-existent-tool")).toBeUndefined()
	})

	test("should get stats", () => {
		const stats = toolSystem.getStats()

		expect(stats.totalTools).toBe(2)
		expect(stats.enabledTools).toBe(2)
		expect(stats.disabledTools).toBe(0)
	})
})
