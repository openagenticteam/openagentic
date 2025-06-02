import { ChatAnthropic } from "@langchain/anthropic"
import type { BaseLanguageModel } from "@langchain/core/language_models/base"
import { HumanMessage } from "@langchain/core/messages"
import { ChatOpenAI } from "@langchain/openai"

import type { CostTracker, ExecutableTool, Tool } from "../types"

import { createToolResponse, handleToolError, prepareExecution, trackUsage } from "./cost-aware-execution"

/**
 * Tool configuration interface
 */
export interface ToolConfig {
  name: string
  description: string
  provider: "openai" | "anthropic" | "custom"
  modelClass: "ChatOpenAI" | "ChatAnthropic" | "custom"
  defaultModel: string
  modelOptions: string[]
  customParameters?: Record<string, any>
  customExecutor?: (params: any, costTracker?: CostTracker) => Promise<any>
}

/**
 * Model class registry
 */
const MODEL_CLASSES = {
  ChatOpenAI,
  ChatAnthropic,
} as const

/**
 * Provider display names for descriptions and error messages
 */
const PROVIDER_DISPLAY_NAMES = {
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
  google: "Google",
  cohere: "Cohere",
  huggingface: "Hugging Face",
  custom: "custom",
} as const

/**
 * Generate tool schema from configuration
 */
export function createToolSchema(config: ToolConfig): Tool {
  const providerDisplay = PROVIDER_DISPLAY_NAMES[config.provider] || config.name

  const baseParameters = {
    message: {
      type: "string",
      description: `The message or prompt to send to the ${providerDisplay} model`,
    },
    apiKey: {
      type: "string",
      description: `The API key for accessing ${providerDisplay} services`,
    },
    modelName: {
      type: "string",
      description: `The ${providerDisplay} model to use for generation`,
      enum: config.modelOptions,
    },
    maxTokens: {
      type: "number",
      description: "Maximum number of tokens to generate (optional, will use cost-aware default if not specified)",
    },
    ...config.customParameters,
  }

  return {
    type: "function",
    function: {
      name: config.name,
      description: config.description,
      parameters: {
        type: "object",
        properties: baseParameters,
        required: ["message", "apiKey"],
        additionalProperties: false,
      },
      strict: true,
    },
  }
}

/**
 * Create execution function from configuration
 */
export function createExecutionFunction(config: ToolConfig) {
  return async (
    params: {
      message: string
      apiKey: string
      modelName?: string
      maxTokens?: number
      [key: string]: any
    },
    costTracker?: CostTracker,
  ) => {
    const { message, apiKey, modelName = config.defaultModel, maxTokens, ...customParams } = params

    // Handle custom executors
    if (config.customExecutor) {
      return config.customExecutor(params, costTracker)
    }

    // Prepare execution with cost-awareness
    const { maxTokens: finalMaxTokens } = prepareExecution({
      message,
      modelName,
      maxTokens,
      costTracker,
    })

    try {
      // Get the model class
      const ModelClass = MODEL_CLASSES[config.modelClass as keyof typeof MODEL_CLASSES]
      if (!ModelClass) {
        throw new Error(`Unsupported model class: ${config.modelClass}`)
      }

      // Create model instance
      const model = new ModelClass({
        apiKey,
        modelName,
        maxTokens: finalMaxTokens,
        ...customParams,
      }) as BaseLanguageModel

      // Execute the model
      const response = await model.invoke([new HumanMessage(message)])

      // Track usage
      trackUsage({
        modelName,
        toolName: config.name,
        responseMetadata: response.response_metadata,
        costTracker,
      })

      // Return standardized response
      return createToolResponse({
        content: response.content,
        modelName,
        responseMetadata: response.response_metadata,
        costTracker,
      })
    } catch (error) {
      // Use capitalized tool name for error messages
      const capitalizedName = PROVIDER_DISPLAY_NAMES[config.provider] || config.name
      handleToolError(error, capitalizedName)
    }
  }
}

/**
 * Create complete executable tool from configuration
 */
export function createExecutableTool(config: ToolConfig): ExecutableTool {
  const schema = createToolSchema(config)
  const execute = createExecutionFunction(config)

  return {
    ...schema,
    execute,
  }
}

/**
 * Create multiple tools from configurations
 */
export function createToolsFromConfigs(configs: ToolConfig[]): ExecutableTool[] {
  return configs.map(createExecutableTool)
}
