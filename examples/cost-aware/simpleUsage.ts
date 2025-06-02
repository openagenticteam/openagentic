/**
 * Cost-Aware OpenAI Usage Example
 * Shows how to use OpenAI models with cost tracking and budget limits
 */

import { ChatOpenAI } from "@langchain/openai"
import { allTools, createAIWithTools } from "openagentic"

async function costAwareOpenAIExample() {
  console.log("=== Cost-Aware OpenAI Example ===\n")

  const OPENAI_API_KEY = "your-openai-api-key"

  // 1. Create your model
  const model = new ChatOpenAI({
    model: "gpt-4",
    apiKey: OPENAI_API_KEY,
  })

  // 2. Wrap it with tools (same tools, cost tracking is now optional)
  const ai = createAIWithTools(model, allTools)

  try {
    // 3. Chat with cost limit (512 cents = $5.12 budget)
    const result = await ai.chat(
      "Please find and fix the bugs in this codebase. Use tools to analyze the code thoroughly.",
      {
        maxCostCents: 512, // $5.12 budget
        conservativeMode: true, // Use conservative token limits
      },
    )

    console.log("Response:", result.response)
    console.log("\nCost Summary:")
    console.log("- Total Cost:", `${result.costTracker!.totalCostCents} cents ($${(result.costTracker!.totalCostCents / 100).toFixed(2)})`)
    console.log("- Budget Used:", `${result.costTracker!.budgetUsedPercentage.toFixed(1)}%`)
    console.log("- Remaining Budget:", `${result.costTracker!.remainingBudgetCents} cents ($${(result.costTracker!.remainingBudgetCents / 100).toFixed(2)})`)
    console.log("- Total Queries:", result.costTracker!.totalQueries)
    console.log("- Orchestrator Queries:", result.costTracker!.orchestratorQueries)
    console.log("- Tool Queries:", result.costTracker!.toolQueries)

    if (result.toolCalls && result.toolCalls.length > 0) {
      console.log("\nTools Used:")
      result.toolCalls.forEach((toolCall, index) => {
        console.log(`${index + 1}. ${toolCall.toolCall?.name}`)
        if (toolCall.error) {
          console.log(`   Error: ${toolCall.error}`)
        }
      })
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : "Unknown error")

    // This might happen if the budget is insufficient
    if (error instanceof Error && error.message.includes("Insufficient budget")) {
      console.log("\n💡 Tip: Try increasing maxCostCents or using a less expensive model")
    }
  }
}

async function multipleQueriesExample() {
  console.log("\n=== Multiple Queries with Shared Budget ===\n")

  const OPENAI_API_KEY = "your-openai-api-key"
  const model = new ChatOpenAI({ model: "gpt-3.5-turbo", apiKey: OPENAI_API_KEY })
  const ai = createAIWithTools(model, allTools)

  const queries = [
    "Analyze the main.py file",
    "Check for security vulnerabilities",
    "Suggest performance improvements",
  ]

  const totalBudget = 100 // 100 cents = $1.00
  let usedBudget = 0

  for (const [index, query] of queries.entries()) {
    const remainingBudget = totalBudget - usedBudget

    if (remainingBudget <= 0) {
      console.log(`❌ Query ${index + 1}: Budget exhausted`)
      break
    }

    try {
      console.log(`🔍 Query ${index + 1}: "${query}"`)
      const result = await ai.chat(query, {
        maxCostCents: remainingBudget,
        conservativeMode: true,
      })

      usedBudget += result.costTracker!.totalCostCents
      console.log(`✅ Cost: ${result.costTracker!.totalCostCents} cents`)
      console.log(`📊 Remaining: ${totalBudget - usedBudget} cents\n`)
    } catch (error) {
      console.log(`❌ Query ${index + 1} failed: ${error instanceof Error ? error.message : "Unknown error"}\n`)
    }
  }

  console.log(`💰 Final Budget Usage: ${usedBudget}/${totalBudget} cents (${((usedBudget / totalBudget) * 100).toFixed(1)}%)`)
}

async function regularUsageExample() {
  console.log("\n=== Regular Usage (No Cost Tracking) ===\n")

  const OPENAI_API_KEY = "your-openai-api-key"
  const model = new ChatOpenAI({ model: "gpt-3.5-turbo", apiKey: OPENAI_API_KEY })
  const ai = createAIWithTools(model, allTools)

  try {
    // Regular chat without cost tracking - just like before!
    const result = await ai.chat("Hello, how are you?")

    console.log("Response:", result.response)
    console.log("Cost Tracker:", result.costTracker ? "Enabled" : "Disabled")
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : "Unknown error")
  }
}

// Run examples
if (require.main === module) {
  costAwareOpenAIExample()
    .then(() => multipleQueriesExample())
    .then(() => regularUsageExample())
    .catch(console.error)
}

export { costAwareOpenAIExample, multipleQueriesExample, regularUsageExample }
