import { LLMToolSystem, BaseLLMTool, LLMToolContext } from "../index.js"
import { z } from "zod"

/**
 * Example: Custom LLM Tools
 *
 * This example demonstrates how to create more advanced custom LLM tools
 * with complex schemas and specialized functionality.
 */

// A code generation tool that produces code snippets
class CodeGenerationTool extends BaseLLMTool {
	constructor() {
		super({
			id: "code-generator",
			name: "Code Generator",
			description: "Generates code snippets in various languages",
			schema: z.object({
				language: z.string(),
				code: z.string(),
				explanation: z.string(),
				imports: z.array(z.string()).optional(),
				complexity: z.enum(["simple", "moderate", "complex"]).optional(),
				performance: z
					.object({
						timeComplexity: z.string().optional(),
						spaceComplexity: z.string().optional(),
						optimizationNotes: z.string().optional(),
					})
					.optional(),
			}),
			xmlTag: "code-snippet",
			category: "development",
		})
	}

	generatePromptSection(context: LLMToolContext) {
		// Extract relevant context
		const language = context.language || "any"
		const task = context.task || "general purpose"

		return this.buildXMLPromptSection(
			"CODE GENERATION - Generate code snippets",
			`<code-snippet>
  <language>programming_language</language>
  <code>
    // Your code here
  </code>
  <explanation>Explanation of how the code works</explanation>
  <imports>
    <import>package or module name</import>
    <!-- Additional imports as needed -->
  </imports>
  <complexity>simple|moderate|complex</complexity>
  <performance>
    <timeComplexity>O(n), O(log n), etc.</timeComplexity>
    <spaceComplexity>O(n), O(1), etc.</spaceComplexity>
    <optimizationNotes>Notes about performance considerations</optimizationNotes>
  </performance>
</code-snippet>`,
			[
				`Generate ${language} code for ${task}`,
				"Include clear explanations of how the code works",
				"List necessary imports or dependencies",
				"Consider performance implications when relevant",
			],
			1,
		)
	}

	async handleResponse(data: z.infer<typeof this.schema>, context: LLMToolContext) {
		console.log(`Generated ${data.language} code snippet:`)
		console.log("-----------------------------------")
		console.log(data.code)
		console.log("-----------------------------------")
		console.log(`Explanation: ${data.explanation}`)

		if (data.imports && data.imports.length > 0) {
			console.log("Required imports:")
			data.imports.forEach((imp: string) => console.log(`- ${imp}`))
		}

		if (data.complexity) {
			console.log(`Complexity level: ${data.complexity}`)
		}

		if (data.performance) {
			console.log("Performance characteristics:")
			if (data.performance.timeComplexity) {
				console.log(`- Time complexity: ${data.performance.timeComplexity}`)
			}
			if (data.performance.spaceComplexity) {
				console.log(`- Space complexity: ${data.performance.spaceComplexity}`)
			}
			if (data.performance.optimizationNotes) {
				console.log(`- Optimization notes: ${data.performance.optimizationNotes}`)
			}
		}

		return data
	}
}

// A data analysis tool that provides insights on datasets
class DataAnalysisTool extends BaseLLMTool {
	constructor() {
		super({
			id: "data-analysis",
			name: "Data Analysis Tool",
			description: "Analyzes data and provides statistical insights",
			schema: z.object({
				datasetName: z.string(),
				analysisType: z.enum(["descriptive", "diagnostic", "predictive", "prescriptive"]),
				metrics: z.array(
					z.object({
						name: z.string(),
						value: z.union([z.number(), z.string()]),
						unit: z.string().optional(),
					}),
				),
				insights: z.array(
					z.object({
						finding: z.string(),
						confidence: z.number().min(0).max(1),
						impact: z.enum(["low", "medium", "high"]),
					}),
				),
				visualizationSuggestions: z
					.array(
						z.object({
							type: z.string(),
							description: z.string(),
						}),
					)
					.optional(),
			}),
			xmlTag: "data-analysis",
			category: "analytics",
		})
	}

	generatePromptSection(context: LLMToolContext) {
		return this.buildXMLPromptSection(
			"DATA ANALYSIS - Analyze data and provide insights",
			`<data-analysis>
  <datasetName>Name of the dataset</datasetName>
  <analysisType>descriptive|diagnostic|predictive|prescriptive</analysisType>
  <metrics>
    <metric>
      <name>Metric name</name>
      <value>Metric value</value>
      <unit>Unit of measurement (optional)</unit>
    </metric>
    <!-- Additional metrics as needed -->
  </metrics>
  <insights>
    <insight>
      <finding>Key finding from the data</finding>
      <confidence>0.0 to 1.0</confidence>
      <impact>low|medium|high</impact>
    </insight>
    <!-- Additional insights as needed -->
  </insights>
  <visualizationSuggestions>
    <suggestion>
      <type>Chart type (bar, line, scatter, etc.)</type>
      <description>What the visualization would show</description>
    </suggestion>
    <!-- Additional visualization suggestions as needed -->
  </visualizationSuggestions>
</data-analysis>`,
			[
				"Analyze the provided data thoroughly",
				"Include relevant statistical metrics",
				"Provide actionable insights with confidence scores",
				"Suggest appropriate visualizations when helpful",
			],
			2,
		)
	}

	async handleResponse(data: z.infer<typeof this.schema>, context: LLMToolContext) {
		console.log(`Analysis of ${data.datasetName} (${data.analysisType}):`)
		console.log("-----------------------------------")

		console.log("Key Metrics:")
		data.metrics.forEach((metric: { name: string; value: string | number; unit?: string }) => {
			const unitStr = metric.unit ? ` ${metric.unit}` : ""
			console.log(`- ${metric.name}: ${metric.value}${unitStr}`)
		})

		console.log("\nInsights:")
		data.insights.forEach((insight: { finding: string; confidence: number; impact: string }) => {
			const confidencePercent = Math.round(insight.confidence * 100)
			console.log(`- ${insight.finding} (${confidencePercent}% confidence, ${insight.impact} impact)`)
		})

		if (data.visualizationSuggestions && data.visualizationSuggestions.length > 0) {
			console.log("\nRecommended Visualizations:")
			data.visualizationSuggestions.forEach((viz: { type: string; description: string }) => {
				console.log(`- ${viz.type}: ${viz.description}`)
			})
		}

		return data
	}
}

// Main example function
async function runExample() {
	// Create the custom tools
	const codeGenTool = new CodeGenerationTool()
	const dataAnalysisTool = new DataAnalysisTool()

	// Create the tool system with both tools
	const toolSystem = new LLMToolSystem({
		tools: [codeGenTool, dataAnalysisTool],
		globalContext: {
			user: "data scientist",
			project: "customer behavior analysis",
			language: "python",
		},
	})

	// Generate the system prompt
	const systemPrompt = toolSystem.generateSystemPrompt()
	console.log("\n=== SYSTEM PROMPT ===\n")
	console.log(systemPrompt)

	// Example LLM response for code generation
	const codeResponse = `
<code-snippet>
  <language>python</language>
  <code>
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.cluster import KMeans

def analyze_customer_segments(data_path, n_clusters=3):
    # Load the customer data
    df = pd.read_csv(data_path)
    
    # Select features for clustering
    features = ['purchase_frequency', 'average_order_value', 'time_since_last_purchase']
    X = df[features].copy()
    
    # Normalize the data
    X_scaled = (X - X.mean()) / X.std()
    
    # Apply KMeans clustering
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    df['segment'] = kmeans.fit_predict(X_scaled)
    
    # Analyze the segments
    segment_analysis = df.groupby('segment').agg({
        'purchase_frequency': 'mean',
        'average_order_value': 'mean',
        'time_since_last_purchase': 'mean',
        'customer_id': 'count'
    }).rename(columns={'customer_id': 'count'})
    
    return df, segment_analysis

# Example usage
if __name__ == "__main__":
    customer_data, segments = analyze_customer_segments('customer_data.csv')
    print(segments)
  </code>
  <explanation>
    This code performs customer segmentation using KMeans clustering. It loads customer data from a CSV file, selects relevant features (purchase frequency, average order value, and time since last purchase), normalizes the data, and applies KMeans to identify customer segments. It then calculates the mean values for each feature within each segment to help understand the characteristics of each customer group.
  </explanation>
  <imports>
    <import>pandas</import>
    <import>matplotlib.pyplot</import>
    <import>seaborn</import>
    <import>sklearn.cluster.KMeans</import>
  </imports>
  <complexity>moderate</complexity>
  <performance>
    <timeComplexity>O(n*k*i) where n is the number of samples, k is the number of clusters, and i is the number of iterations</timeComplexity>
    <spaceComplexity>O(n) for storing the dataset and results</spaceComplexity>
    <optimizationNotes>For very large datasets, consider using MiniBatchKMeans instead of standard KMeans for better performance. Also, feature selection is important as irrelevant features can degrade clustering quality.</optimizationNotes>
  </performance>
</code-snippet>
`

	// Process the code generation response
	console.log("\n=== PROCESSING CODE GENERATION RESPONSE ===\n")
	const codeResults = await toolSystem.processCompleteResponse(codeResponse)

	// Example LLM response for data analysis
	const analysisResponse = `
<data-analysis>
  <datasetName>Customer Purchase History</datasetName>
  <analysisType>diagnostic</analysisType>
  <metrics>
    <metric>
      <name>Average Customer Lifetime Value</name>
      <value>842.50</value>
      <unit>USD</unit>
    </metric>
    <metric>
      <name>Customer Retention Rate</name>
      <value>0.68</value>
    </metric>
    <metric>
      <name>Average Purchase Frequency</name>
      <value>2.3</value>
      <unit>orders/month</unit>
    </metric>
    <metric>
      <name>Customer Acquisition Cost</name>
      <value>65.20</value>
      <unit>USD</unit>
    </metric>
  </metrics>
  <insights>
    <insight>
      <finding>Customers who make a second purchase within 30 days of their first purchase have 3x higher lifetime value</finding>
      <confidence>0.92</confidence>
      <impact>high</impact>
    </insight>
    <insight>
      <finding>Free shipping promotions increase average order value by 15%</finding>
      <confidence>0.78</confidence>
      <impact>medium</impact>
    </insight>
    <insight>
      <finding>Mobile app users have 27% higher purchase frequency than web-only customers</finding>
      <confidence>0.85</confidence>
      <impact>high</impact>
    </insight>
    <insight>
      <finding>Email engagement has declined 12% over the past quarter</finding>
      <confidence>0.88</confidence>
      <impact>medium</impact>
    </insight>
  </insights>
  <visualizationSuggestions>
    <suggestion>
      <type>Cohort Analysis Heatmap</type>
      <description>Visualize retention rates by customer acquisition cohort over time</description>
    </suggestion>
    <suggestion>
      <type>Funnel Chart</type>
      <description>Show conversion rates through the purchase funnel from product view to checkout</description>
    </suggestion>
    <suggestion>
      <type>Scatter Plot</type>
      <description>Plot customer lifetime value against purchase frequency with point size representing average order value</description>
    </suggestion>
  </visualizationSuggestions>
</data-analysis>
`

	// Process the data analysis response
	console.log("\n=== PROCESSING DATA ANALYSIS RESPONSE ===\n")
	const analysisResults = await toolSystem.processCompleteResponse(analysisResponse)
}

// For direct execution:
runExample().catch(console.error)

export { CodeGenerationTool, DataAnalysisTool, runExample }
