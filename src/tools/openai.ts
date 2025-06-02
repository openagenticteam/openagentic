import { HumanMessage } from "@langchain/core/messages"
import type { OpenAIChatInput } from "@langchain/openai"
import { ChatOpenAI } from "@langchain/openai"

import type { CostTracker, ExecutableTool, Tool, UsageRecord } from "../types"

/**
 * OpenAI Tool Schema
 * Pure schema definition without execution logic
 */
export const openaiTool: Tool = {
  type: "function",
  function: {
    name: "openai",
    description: "Use OpenAI model to generate responses for various tasks including text generation, analysis, and creative writing",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The message or prompt to send to the OpenAI model",
        },
        apiKey: {
          type: "string",
          description: "The API key for accessing OpenAI services",
        },
        modelName: {
          type: "string",
          description: "The OpenAI model to use for generation",
          enum: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo", "gpt-4-1106-preview"],
        },
        maxTokens: {
          type: "number",
          description: "Maximum number of tokens to generate (optional, will use cost-aware default if not specified)",
        },
      },
      required: ["message", "apiKey"],
      additionalProperties: false,
    },
    strict: true,
  },
}

/**
 * OpenAI Tool Execution Function
 * Handles the actual execution of OpenAI API calls with optional cost tracking
 */
export const executeOpenAi = async (
  {
    message,
    apiKey,
    modelName = "gpt-4-1106-preview",
    maxTokens,
  }: {
    message: string
    apiKey: string
    modelName?: OpenAIChatInput["model"]
    maxTokens?: number
  },
  costTracker?: CostTracker,
) => {
  // Pre-execution cost check (only if cost tracker provided)
  if (costTracker) {
    const promptLength = message.length
    const estimatedOutputTokens = maxTokens || costTracker.getDefaultMaxTokens(modelName)

    if (!costTracker.canAffordQuery(modelName, promptLength, estimatedOutputTokens)) {
      throw new Error(`Insufficient budget: Query estimated to cost more than remaining budget of ${costTracker.getRemainingBudgetCents()} cents`)
    }

    // Use cost-aware maxTokens if not provided
    maxTokens = maxTokens || costTracker.getDefaultMaxTokens(modelName)
  }

  try {
    const model = new ChatOpenAI({
      apiKey,
      modelName,
      maxTokens,
    })

    const response = await model.invoke([new HumanMessage(message)])

    // Track actual usage (only if cost tracker provided)
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
          source: "tool",
          toolName: "openai",
        }

        costTracker.addUsage(usageRecord)
      }
    }

    return {
      success: true,
      response: response.content,
      model: modelName,
      usage: response.response_metadata?.tokenUsage || null,
      ...(costTracker && { costTracker: costTracker.getSummary() }),
    }
  } catch (error) {
    throw new Error(`OpenAI execution failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Executable OpenAI Tool
 * Combines schema with execution function
 */
export const openaiExecutableTool: ExecutableTool = {
  ...openaiTool,
  execute: executeOpenAi,
}

// Legacy exports for backward compatibility
export const openai = openaiTool
