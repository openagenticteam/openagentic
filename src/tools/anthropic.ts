import type { AnthropicInput } from "@langchain/anthropic"
import { ChatAnthropic } from "@langchain/anthropic"
import { HumanMessage } from "@langchain/core/messages"

import type { ExecutableTool, Tool } from "../types"

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
      },
      required: ["message", "apiKey"],
      additionalProperties: false,
    },
    strict: true,
  },
}

/**
 * Anthropic Tool Execution Function
 * Handles the actual execution of Anthropic API calls
 */
export const executeAnthropic = async ({
  message,
  apiKey,
  modelName = "claude-3-5-sonnet-20240620",
}: {
  message: string
  apiKey: string
  modelName?: AnthropicInput["model"]
}) => {
  try {
    const model = new ChatAnthropic({
      apiKey,
      modelName,
    })

    const response = await model.invoke([new HumanMessage(message)])

    return {
      success: true,
      response: response.content,
      model: modelName,
      usage: response.response_metadata?.tokenUsage || null,
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
