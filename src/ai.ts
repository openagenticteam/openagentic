import type { BaseLanguageModel } from "@langchain/core/language_models/base"

import type { CostAwareOptions, ToolCollection, UsageRecord } from "./types"
import { createCostTracker } from "./utils/cost-tracker"

export interface AIWithTools {
  chat: (message: string, options?: CostAwareOptions) => Promise<{
    response: string
    toolCalls?: any[]
    metadata?: any
    costTracker?: {
      totalCostCents: number
      maxCostCents: number
      remainingBudgetCents: number
      budgetUsedPercentage: number
      totalQueries: number
      orchestratorQueries: number
      toolQueries: number
    }
  }>
  model: BaseLanguageModel
  tools: ToolCollection
}

/**
 * Create an AI interface with tools that simplifies usage to just a few lines
 * Automatically handles tool binding, execution, result formatting, and optional cost tracking
 */
export const createAIWithTools = (
  model: BaseLanguageModel,
  toolCollection: ToolCollection,
): AIWithTools => {
  // Type assertion for bindTools method (available on most LangChain models)
  const modelWithBindTools = model as BaseLanguageModel & {
    bindTools?: (tools: any[]) => BaseLanguageModel
  }

  // Bind tools to the model if the method exists
  const boundModel = modelWithBindTools.bindTools
    ? modelWithBindTools.bindTools(toolCollection.toolsForChatCompletion)
    : model

  const chat = async (message: string, options?: CostAwareOptions) => {
    const costTracker = options?.maxCostCents ? createCostTracker(options.maxCostCents) : undefined

    try {
      // Get model name for cost tracking
      const modelName = (model as any).modelName || (model as any).model || "gpt-4"

      // Pre-execution cost check for orchestrator (if cost tracker enabled)
      if (costTracker && !costTracker.canAffordQuery(modelName, message.length)) {
        throw new Error(`Insufficient budget: Orchestrator query estimated to cost more than remaining budget of ${costTracker.getRemainingBudgetCents()} cents`)
      }

      // Use cost-aware maxTokens for the orchestrator (if cost tracker enabled)
      let maxTokens: number | undefined
      if (costTracker) {
        const baseMaxTokens = costTracker.getDefaultMaxTokens(modelName)
        if (options?.conservativeMode) {
          // Conservative mode: use more restrictive token limits
          maxTokens = Math.min(baseMaxTokens, 1024)
        } else {
          // Normal mode: use the cost tracker's dynamic token limits
          maxTokens = baseMaxTokens
        }
      }

      // Type assertion for invoke method
      const invokeModel = boundModel as BaseLanguageModel & {
        invoke: (messages: any[], options?: any) => Promise<any>
      }

      const response = await invokeModel.invoke([
        { role: "user", content: message },
      ], maxTokens ? { maxTokens } : undefined)

      // Track orchestrator usage (if cost tracker enabled)
      if (costTracker) {
        const usage = response.response_metadata?.tokenUsage
        if (usage) {
          const inputTokens = usage.promptTokens || 0
          const outputTokens = usage.completionTokens || 0
          const actualCost = costTracker.estimateCost(modelName, inputTokens, outputTokens)

          const usageRecord: UsageRecord = {
            model: modelName,
            inputTokens,
            outputTokens,
            costCents: actualCost,
            timestamp: new Date(),
            source: "orchestrator",
          }

          costTracker.addUsage(usageRecord)
        }
      }

      // Handle tool calls
      if (response.tool_calls && response.tool_calls.length > 0) {
        const toolResults = []

        for (const toolCall of response.tool_calls) {
          try {
            const result = await toolCollection.execute({
              function: {
                name: toolCall.name,
                arguments: JSON.stringify(toolCall.args || {}),
              },
            }, costTracker)
            toolResults.push({
              toolCall,
              result,
            })
          } catch (error) {
            toolResults.push({
              toolCall,
              error: error instanceof Error ? error.message : "Unknown error",
            })
          }
        }

        return {
          response: response.content || "",
          toolCalls: toolResults,
          metadata: response.response_metadata,
          ...(costTracker && { costTracker: costTracker.getSummary() }),
        }
      }

      return {
        response: response.content || response.toString(),
        metadata: response.response_metadata,
        ...(costTracker && { costTracker: costTracker.getSummary() }),
      }
    } catch (error) {
      throw new Error(`AI chat failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  return {
    chat,
    model: boundModel,
    tools: toolCollection,
  }
}
