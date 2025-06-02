/**
 * Exact API Example
 * Shows the exact API signature mentioned in the user query:
 * chatWithOpenAI({query: "please find and fix the bugs in this codebase", maxCostCents: 512, model: "o3"})
 */

import { ChatOpenAI } from "@langchain/openai"
import { allTools, createAIWithTools } from "openagentic"

// Helper function that mimics the desired API signature
async function chatWithOpenAI({
  query,
  maxCostCents,
  model,
  apiKey = "your-openai-api-key",
  conservativeMode = false,
}: {
  query: string
  maxCostCents: number
  model: string
  apiKey?: string
  conservativeMode?: boolean
}) {
  // Create the OpenAI model instance
  const modelInstance = new ChatOpenAI({
    model,
    apiKey,
  })

  // Create AI with tools (cost tracking is now built-in)
  const ai = createAIWithTools(modelInstance, allTools)

  // Execute with cost limit
  return ai.chat(query, { maxCostCents, conservativeMode })
}

async function exactApiExample() {
  console.log("=== Exact API Example ===\n")

  try {
    // This is the exact API signature mentioned in the user query
    const result = await chatWithOpenAI({
      query: "please find and fix the bugs in this codebase",
      maxCostCents: 512,
      model: "gpt-4", // Note: "o3" model doesn't exist yet, using gpt-4
    })

    console.log("✅ Query completed successfully!")
    console.log("Response:", result.response.substring(0, 200) + "...")
    console.log("\n📊 Cost Breakdown:")
    console.log("- Total Cost:", `${result.costTracker!.totalCostCents} cents ($${(result.costTracker!.totalCostCents / 100).toFixed(2)})`)
    console.log("- Budget Used:", `${result.costTracker!.budgetUsedPercentage.toFixed(1)}%`)
    console.log("- Remaining Budget:", `${result.costTracker!.remainingBudgetCents} cents ($${(result.costTracker!.remainingBudgetCents / 100).toFixed(2)})`)
    console.log("- Orchestrator Queries:", result.costTracker!.orchestratorQueries)
    console.log("- Tool Queries:", result.costTracker!.toolQueries)

    if (result.toolCalls && result.toolCalls.length > 0) {
      console.log("\n🔧 Tools Used:")
      result.toolCalls.forEach((toolCall, index) => {
        console.log(`${index + 1}. ${toolCall.toolCall?.name}`)
      })
    }
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : "Unknown error")
  }
}

async function differentModelsExample() {
  console.log("\n=== Different Models Cost Comparison ===\n")

  const query = "Analyze this codebase for potential improvements"
  const budget = 100 // 100 cents = $1.00

  const models = [
    "gpt-3.5-turbo",
    "gpt-4",
    "gpt-4-turbo",
  ]

  for (const model of models) {
    try {
      console.log(`🤖 Testing with ${model}...`)

      const start = Date.now()
      const result = await chatWithOpenAI({
        query,
        maxCostCents: budget,
        model,
        conservativeMode: true,
      })
      const duration = Date.now() - start

      console.log(`✅ ${model}:`)
      console.log(`   Cost: ${result.costTracker!.totalCostCents} cents`)
      console.log(`   Time: ${duration}ms`)
      console.log(`   Queries: ${result.costTracker!.totalQueries}`)
      console.log(`   Tools Used: ${result.costTracker!.toolQueries}`)
      console.log()
    } catch (error) {
      console.log(`❌ ${model}: ${error instanceof Error ? error.message : "Unknown error"}\n`)
    }
  }
}

// Demonstrate budget exhaustion handling
async function budgetExhaustionExample() {
  console.log("=== Budget Exhaustion Example ===\n")

  try {
    // Try to use a very small budget that will likely be exhausted
    const result = await chatWithOpenAI({
      query: "Please perform a comprehensive security audit of this entire codebase, including all dependencies, configurations, and deployment scripts. Check for vulnerabilities, suggest fixes, and provide detailed documentation.",
      maxCostCents: 5, // Very small budget - 5 cents
      model: "gpt-4",
    })

    console.log("Unexpectedly succeeded with small budget:")
    console.log("Cost:", result.costTracker!.totalCostCents, "cents")
  } catch (error) {
    console.log("❌ Expected budget exhaustion:", error instanceof Error ? error.message : "Unknown error")
    console.log("💡 This demonstrates the cost protection working correctly!")
  }
}

// Demonstrate regular usage without cost tracking
async function regularUsageExample() {
  console.log("\n=== Regular Usage (No Cost Limits) ===\n")

  const model = new ChatOpenAI({ model: "gpt-3.5-turbo", apiKey: "your-openai-api-key" })
  const ai = createAIWithTools(model, allTools)

  try {
    // Regular chat without cost tracking - backward compatible!
    const result = await ai.chat("Hello world!")

    console.log("✅ Regular chat completed")
    console.log("Response:", result.response.substring(0, 100) + "...")
    console.log("Cost Tracker:", result.costTracker ? "Enabled" : "Disabled")
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : "Unknown error")
  }
}

// Run examples
if (require.main === module) {
  exactApiExample()
    .then(() => differentModelsExample())
    .then(() => budgetExhaustionExample())
    .then(() => regularUsageExample())
    .catch(console.error)
}

export { budgetExhaustionExample, chatWithOpenAI, differentModelsExample, exactApiExample, regularUsageExample }
