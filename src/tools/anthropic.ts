import type { AnthropicInput } from "@langchain/anthropic"
import { ChatAnthropic } from "@langchain/anthropic"
import { HumanMessage } from "@langchain/core/messages"

import type { CostTracker, ExecutableTool, Tool, UsageRecord } from "../types"

/**
 * Anthropic Tool Schema
 * Pure schema definition without execution logic
 */
export const anthropicTool: Tool = {
  type: "function",
  function: {
    name: "anthropic",
    description: "Use Anthropic Claude model to generate responses, analysis, and creative content with advanced reasoning capabilities",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The message or prompt to send to the Anthropic Claude model",
        },
        apiKey: {
          type: "string",
          description: "The API key for accessing Anthropic Claude services",
        },
        modelName: {
          type: "string",
          description: "The Anthropic Claude model to use for generation",
          enum: ["claude-3-5-sonnet-20240620", "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
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
 * Anthropic Tool Execution Function
 * Handles the actual execution of Anthropic API calls with optional cost tracking
 */
export const executeAnthropic = async (
  {
    message,
    apiKey,
    modelName = "claude-3-5-sonnet-20240620",
    maxTokens,
  }: {
    message: string
    apiKey: string
    modelName?: AnthropicInput["model"]
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
    const model = new ChatAnthropic({
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
          toolName: "anthropic",
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
    throw new Error(`Anthropic execution failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Executable Anthropic Tool
 * Combines schema with execution function
 */
export const anthropicExecutableTool: ExecutableTool = {
  ...anthropicTool,
  execute: executeAnthropic,
}

// Legacy exports for backward compatibility
export const anthropic = anthropicTool
