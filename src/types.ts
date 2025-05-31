/**
 * OpenAI Function Calling compliant types
 * Following the standard OpenAI function calling schema for maximum compatibility
 */

export interface FunctionParameters {
  type: "object"
  properties: Record<string, any>
  required?: string[]
  additionalProperties?: boolean
}

export interface FunctionDefinition {
  name: string
  description: string
  parameters: FunctionParameters
  strict?: boolean
}

export interface Tool {
  type: "function"
  function: FunctionDefinition
}

export interface ExecutableTool extends Tool {
  execute: (args: any) => Promise<any>
}

export interface ToolCall {
  function: {
    name: string
    arguments: string
  }
}

export interface ToolRegistry {
  [toolName: string]: ExecutableTool
}

export interface ToolCollection {
  tools: Tool[]
  toolsForChatCompletion: Tool[]
  toolsForResponsesAPI: Array<{ type: "function", function: FunctionDefinition }>
  registry: ToolRegistry
  execute: (toolCall: ToolCall) => Promise<any>
}

// Legacy type for backward compatibility
export type OATool = Tool & {
  example?: string
}
