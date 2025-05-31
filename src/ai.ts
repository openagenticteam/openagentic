import type { BaseLanguageModel } from "@langchain/core/language_models/base"

import type { ToolCollection } from "./types"

export interface AIWithTools {
  chat: (message: string) => Promise<{
    response: string
    toolCalls?: any[]
    metadata?: any
  }>
  model: BaseLanguageModel
  tools: ToolCollection
}

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

  const chat = async (message: string) => {
    try {
      // Type assertion for invoke method
      const invokeModel = boundModel as BaseLanguageModel & {
        invoke: (messages: any[]) => Promise<any>
      }

      const response = await invokeModel.invoke([
        { role: "user", content: message },
      ])

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
            })
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
        }
      }

      return {
        response: response.content || response.toString(),
        metadata: response.response_metadata,
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
