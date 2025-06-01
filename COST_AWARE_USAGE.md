# Cost-Aware Model Querying

OpenAgentic now supports cost-aware model querying, allowing you to set budget limits and track costs across orchestrator models and the tools they call.

## Quick Start

```typescript
import { ChatOpenAI } from "@langchain/openai"
import { allCostAwareTools, createCostAwareAIWithTools } from "openagentic"

// Create your model
const model = new ChatOpenAI({ model: "gpt-4", apiKey: "your-api-key" })

// Create cost-aware AI
const ai = createCostAwareAIWithTools(model, allCostAwareTools)

// Chat with cost limit
const result = await ai.chatWithCostLimit(
  "Please find and fix the bugs in this codebase",
  {
    maxCostCents: 512, // $5.12 budget
    conservativeMode: true // Optional: use conservative token limits
  }
)

console.log("Response:", result.response)
console.log("Total cost:", result.costTracker.totalCostCents, "cents")
console.log("Budget used:", result.costTracker.budgetUsedPercentage.toFixed(1), "%")
```

## Features

### 🎯 **Budget Management**
- Set maximum cost limits in cents (`maxCostCents`)
- Automatic cost tracking for orchestrator and tool queries
- Budget exhaustion protection - queries fail gracefully when budget is exceeded

### 📊 **Cost Tracking**
- Real-time cost calculation based on token usage
- Separate tracking for orchestrator vs. tool queries
- Detailed cost summaries and usage history

### 🛡️ **Conservative Mode**
- Automatically reduces `maxTokens` as budget gets low
- 90%+ budget remaining: Full token capacity
- 70-90% budget remaining: Moderate token limits (2048 max)
- <70% budget remaining: Minimal token limits (512 max)

### 💰 **Cost Estimation**
- Pre-execution cost estimation to prevent budget overruns
- Uses real model pricing data from [model_prices_and_context_window.json](../src/utils/model_prices_and_context_window.json)
- Supports 1000+ models across multiple providers

## API Reference

### `createCostAwareAIWithTools(model, toolCollection)`

Creates a cost-aware AI interface that tracks costs and respects budget limits.

**Parameters:**
- `model`: LangChain model instance
- `toolCollection`: Cost-aware tool collection

**Returns:** `CostAwareAIWithTools` with `chatWithCostLimit` method

### `chatWithCostLimit(message, options)`

Execute a query with cost tracking and budget limits.

**Parameters:**
- `message`: String query to send to the model
- `options`: Object with:
  - `maxCostCents`: Maximum cost in cents (required)
  - `conservativeMode`: Boolean to enable conservative token usage (optional)

**Returns:** Object with:
- `response`: Model response string
- `toolCalls`: Array of tool executions (if any)
- `metadata`: Model response metadata
- `costTracker`: Cost tracking summary

### Cost Tracker Summary

The `costTracker` object includes:

```
{
  totalCostCents: number,           // Total cost in cents
  maxCostCents: number,             // Budget limit in cents
  remainingBudgetCents: number,     // Remaining budget in cents
  budgetUsedPercentage: number,     // Percentage of budget used
  totalQueries: number,             // Total number of queries
  orchestratorQueries: number,      // Queries made by orchestrator
  toolQueries: number               // Queries made by tools
}
```

## Examples

### Basic Usage

```typescript
import { ChatOpenAI } from "@langchain/openai"
import { allCostAwareTools, createCostAwareAIWithTools } from "openagentic"

const model = new ChatOpenAI({ model: "gpt-4", apiKey: "your-key" })
const ai = createCostAwareAIWithTools(model, allCostAwareTools)

const result = await ai.chatWithCostLimit(
  "Analyze this codebase for security vulnerabilities",
  { maxCostCents: 200 } // $2.00 budget
)
```

### Multiple Queries with Shared Budget

```typescript
const totalBudget = 500 // $5.00
let usedBudget = 0

const queries = [
  "Find potential bugs",
  "Suggest performance improvements",
  "Check security vulnerabilities"
]

for (const query of queries) {
  const remainingBudget = totalBudget - usedBudget

  if (remainingBudget <= 0) {
    break
  }

  const result = await ai.chatWithCostLimit(query, {
    maxCostCents: remainingBudget
  })

  usedBudget += result.costTracker.totalCostCents
}
```

### Different Models Cost Comparison

```typescript
const models = ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"]
const query = "Analyze this code"
const budget = 100 // $1.00

for (const modelName of models) {
  const model = new ChatOpenAI({ model: modelName, apiKey: "your-key" })
  const ai = createCostAwareAIWithTools(model, allCostAwareTools)

  try {
    const result = await ai.chatWithCostLimit(query, { maxCostCents: budget })
    console.log(`${modelName}: ${result.costTracker.totalCostCents} cents`)
  } catch (error) {
    console.log(`${modelName}: Budget exceeded`)
  }
}
```

### Creating a Simple API Wrapper

```typescript
// Helper function that provides the exact API mentioned in the original request
async function chatWithOpenAI({
  query,
  maxCostCents,
  model,
  apiKey = process.env.OPENAI_API_KEY,
  conservativeMode = false,
}: {
  query: string
  maxCostCents: number
  model: string
  apiKey?: string
  conservativeMode?: boolean
}) {
  const modelInstance = new ChatOpenAI({ model, apiKey })
  const ai = createCostAwareAIWithTools(modelInstance, allCostAwareTools)

  return ai.chatWithCostLimit(query, { maxCostCents, conservativeMode })
}

// Usage exactly as requested:
const result = await chatWithOpenAI({
  query: "please find and fix the bugs in this codebase",
  maxCostCents: 512,
  model: "gpt-4"
})
```

## Cost-Aware Tools

Cost-aware tools track their own usage and respect budget limits:

```typescript
import {
  anthropicCostAwareExecutableTool,
  createCostAwareToolCollection,
  openaiCostAwareExecutableTool
} from "openagentic"

// Create custom cost-aware tool collections
const customTools = createCostAwareToolCollection([
  openaiCostAwareExecutableTool,
  anthropicCostAwareExecutableTool,
])
```

## Error Handling

```typescript
try {
  const result = await ai.chatWithCostLimit(query, { maxCostCents: 10 })
  // Process result
} catch (error) {
  if (error.message.includes("Insufficient budget")) {
    console.log("Budget exceeded - try increasing maxCostCents")
  } else {
    console.log("Other error:", error.message)
  }
}
```

## Best Practices

1. **Start with Conservative Budgets**: Begin with small budgets and increase as needed
2. **Use Conservative Mode**: Enable for production environments with strict cost controls
3. **Monitor Budget Usage**: Check `budgetUsedPercentage` to understand spending patterns
4. **Handle Budget Exhaustion**: Always wrap calls in try-catch blocks
5. **Choose Appropriate Models**: Use cheaper models (gpt-3.5-turbo) for simple tasks

## Model Pricing

Pricing data is automatically loaded from the comprehensive [model_prices_and_context_window.json](../src/utils/model_prices_and_context_window.json) file, which includes:

- **1000+ models** across multiple providers
- **Real-time pricing** in cost per token
- **Context window limits** for each model
- **Feature support** flags (function calling, vision, etc.)

Costs are calculated as:
```
Total Cost = (Input Tokens × Input Cost per Token) + (Output Tokens × Output Cost per Token)
```

## Backward Compatibility

All existing APIs remain unchanged. Cost-aware functionality is opt-in through the new `createCostAwareAIWithTools` function and `chatWithCostLimit` method.

```typescript
// Existing API - still works
const ai = createAIWithTools(model, allTools)
const result = await ai.chat("Hello")

// New cost-aware API - opt-in
const costAwareAI = createCostAwareAIWithTools(model, allCostAwareTools)
const result = await costAwareAI.chatWithCostLimit("Hello", { maxCostCents: 100 })
```
