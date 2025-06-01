import type { BaseLanguageModel } from "@langchain/core/language_models/base"

import type { AIWithTools, CostAwareOptions, CostTracker, ToolCollection } from "./types"
import { createCostTracker } from "./utils/cost-tracker"

/**
 * Create an AI interface with tools that simplifies usage to just a few lines
 * Automatically handles tool binding, execution, and result formatting
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
    try {
      // Create cost tracker if options provided
      const costTracker = options ? createCostTracker(options.maxCostCents) : undefined

      // Type assertion for invoke method
      const invokeModel = boundModel as BaseLanguageModel & {
        invoke: (messages: any[]) => Promise<any>
      }

      // Pre-execution budget check for orchestrator
      if (costTracker) {
        const modelName = (model as any).modelName || "gpt-4" // Default to gpt-4 if model name not available
        if (!costTracker.canAffordQuery(modelName, message.length)) {
          throw new Error(`Insufficient budget: Query estimated to cost more than remaining budget of ${costTracker.getRemainingBudgetCents()} cents`)
        }
      }

      const response = await invokeModel.invoke([
        { role: "user", content: message },
      ])

      // Track orchestrator usage
      if (costTracker && response.response_metadata?.tokenUsage) {
        const { promptTokens, completionTokens } = response.response_metadata.tokenUsage
        const modelName = (model as any).modelName || "gpt-4"
        const costCents = costTracker.estimateCost(modelName, promptTokens, completionTokens)

        costTracker.addUsage({
          model: modelName,
          inputTokens: promptTokens,
          outputTokens: completionTokens,
          costCents,
          timestamp: new Date(),
          source: "orchestrator",
        })
      }

      // Handle tool calls if present
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
          costTracker: costTracker?.getSummary(),
        }
      }

      return {
        response: response.content || response.toString(),
        metadata: response.response_metadata,
        costTracker: costTracker?.getSummary(),
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