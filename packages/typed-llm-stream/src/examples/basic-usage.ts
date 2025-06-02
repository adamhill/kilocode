import { LLMToolSystem, BaseLLMTool } from "../index.js"
import { z } from "zod"

/**
 * Example: Basic usage of typed-llm-stream
 *
 * This example demonstrates how to create a simple LLM tool and use it with the LLMToolSystem.
 */

// Define a simple greeting tool
class GreetingTool extends BaseLLMTool {
	constructor() {
		super({
			id: "greeting",
			name: "Greeting Generator",
			description: "Generates personalized greetings",
			schema: z.object({
				name: z.string(),
				style: z.enum(["formal", "casual", "friendly"]),
				message: z.string(),
			}),
			xmlTag: "greeting",
		})
	}

	generatePromptSection(context: any) {
		return this.buildXMLPromptSection(
			"GREETING - Generate a personalized greeting",
			"<greeting><name>person_name</name><style>formal|casual|friendly</style><message>greeting_text</message></greeting>",
			["Generate appropriate greetings based on context", "Consider the relationship and setting"],
			1,
		)
	}

	async handleResponse(data: any, context: any) {
		console.log(`Generated greeting: ${data.message} (${data.style} style for ${data.name})`)
		return data
	}
}

// Define a recommendation tool
class RecommendationTool extends BaseLLMTool {
	constructor() {
		super({
			id: "recommendation",
			name: "Recommendation Generator",
			description: "Generates personalized recommendations",
			schema: z.object({
				category: z.string(),
				items: z
					.array(
						z.object({
							name: z.string(),
							reason: z.string(),
							score: z.number().min(1).max(10).optional(),
						}),
					)
					.min(1)
					.max(5),
				audience: z.string().optional(),
			}),
			xmlTag: "recommendation",
		})
	}

	generatePromptSection(context: any) {
		return this.buildXMLPromptSection(
			"RECOMMENDATION - Generate personalized recommendations",
			`<recommendation>
  <category>books|movies|restaurants|etc</category>
  <items>
    <item>
      <name>Item name</name>
      <reason>Why this is recommended</reason>
      <score>1-10 (optional)</score>
    </item>
    <!-- More items can be included -->
  </items>
  <audience>Target audience (optional)</audience>
</recommendation>`,
			["Generate relevant recommendations based on context", "Include 1-5 items with clear reasons"],
			2,
		)
	}

	async handleResponse(data: any, context: any) {
		console.log(`Generated ${data.items.length} recommendations for ${data.category}:`)
		data.items.forEach((item: any, index: number) => {
			console.log(
				`  ${index + 1}. ${item.name} - ${item.reason} ${item.score ? `(Score: ${item.score}/10)` : ""}`,
			)
		})
		if (data.audience) {
			console.log(`Target audience: ${data.audience}`)
		}
		return data
	}
}

// Main example function
async function runExample() {
	// Create the tools
	const greetingTool = new GreetingTool()
	const recommendationTool = new RecommendationTool()

	// Create the tool system with both tools
	const toolSystem = new LLMToolSystem({
		tools: [greetingTool, recommendationTool],
		globalContext: {
			user: "developer",
			preferences: ["technology", "science fiction", "productivity"],
		},
	})

	// Generate the system prompt that would be sent to an LLM
	const systemPrompt = toolSystem.generateSystemPrompt()
	console.log("\n=== SYSTEM PROMPT ===\n")
	console.log(systemPrompt)

	// Generate a user prompt
	const userPrompt = toolSystem.generateUserPrompt({
		query: "Recommend some books and greet me",
		userName: "Alice",
	})
	console.log("\n=== USER PROMPT ===\n")
	console.log(userPrompt)

	// Example LLM response (this would normally come from an actual LLM API)
	const exampleResponse = `
I'd be happy to help with that!

<greeting>
  <name>Alice</name>
  <style>friendly</style>
  <message>Hey Alice! Great to see you today. Hope you're having a wonderful day!</message>
</greeting>

<recommendation>
  <category>books</category>
  <items>
    <item>
      <name>Project Hail Mary</name>
      <reason>A science fiction novel by Andy Weir that combines technical problem-solving with an engaging story about first contact.</reason>
      <score>9</score>
    </item>
    <item>
      <name>Atomic Habits</name>
      <reason>A practical productivity book that breaks down how small changes can lead to remarkable results.</reason>
      <score>8</score>
    </item>
    <item>
      <name>The Pragmatic Programmer</name>
      <reason>A classic technology book that offers practical advice for software developers.</reason>
      <score>9</score>
    </item>
  </items>
  <audience>technology enthusiasts who enjoy science fiction and want to improve productivity</audience>
</recommendation>
`

	console.log("\n=== PROCESSING RESPONSE ===\n")

	// Process the complete response
	const results = await toolSystem.processCompleteResponse(exampleResponse)

	console.log("\n=== RESULTS ===\n")
	console.log(`Processed ${results.length} tool results`)
	results.forEach((result, index) => {
		console.log(`\nResult ${index + 1}: ${result.toolId}`)
		console.log(JSON.stringify(result.data, null, 2))
	})

	// Example of streaming processing
	console.log("\n=== STREAMING EXAMPLE ===\n")

	// Convert the string to a mock async iterable for demonstration
	async function* mockStream() {
		const chunks = exampleResponse.split("\n")
		for (const chunk of chunks) {
			yield chunk + "\n"
			// Simulate network delay
			await new Promise((resolve) => setTimeout(resolve, 100))
		}
	}

	console.log("Processing stream...")
	for await (const result of toolSystem.processResponseStream(mockStream())) {
		console.log(`Received streaming result for tool: ${result.toolId}`)
	}
}

// Run the example when called directly
// In a Node.js environment, you would use:
// if (require.main === module) {
//   runExample().catch(console.error);
// }

// For browser or direct execution:
runExample().catch(console.error)

export { GreetingTool, RecommendationTool, runExample }
