import { HumanMessage } from "@langchain/core/messages"
import type { OpenAIChatInput } from "@langchain/openai"
import { ChatOpenAI } from "@langchain/openai"

import type { ExecutableTool, Tool } from "../types"

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
      },
      required: ["message", "apiKey"],
      additionalProperties: false,
    },
    strict: true,
  },
}

/**
 * OpenAI Tool Execution Function
 * Handles the actual execution of OpenAI API calls
 */
export const executeOpenAi = async ({
  message,
  apiKey,
  modelName = "gpt-4-1106-preview",
}: {
  message: string
  apiKey: string
  modelName?: OpenAIChatInput["model"]
}) => {
  try {
    const model = new ChatOpenAI({
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
