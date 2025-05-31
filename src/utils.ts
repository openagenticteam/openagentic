import type { ExecutableTool, FunctionDefinition, Tool, ToolCall, ToolCollection, ToolRegistry } from "./types"

/**
 * Convert a Tool to OpenAI Chat Completions format
 * This is typically the format used by most LangChain integrations
 */
export const toOpenAIFunction = (tool: Tool): Tool => {
  return tool // Already in the correct format
}

/**
 * Convert a Tool to OpenAI Responses API format
 * Used specifically with the OpenAI Responses API
 */
export const toOpenAIResponseTool = (tool: Tool): { type: "function", function: FunctionDefinition } => {
  return {
    type: "function",
    function: tool.function,
  }
}

/**
 * Create a tool collection from an array of executable tools
 * Provides multiple format options and execution capabilities
 */
export const createToolCollection = (executableTools: ExecutableTool[]): ToolCollection => {
  const tools: Tool[] = executableTools.map(({ execute, ...tool }) => tool)
  const registry: ToolRegistry = {}

  // Build registry
  executableTools.forEach((tool) => {
    registry[tool.function.name] = tool
  })

  const execute = async (toolCall: ToolCall): Promise<any> => {
    const { name, arguments: args } = toolCall.function
    const tool = registry[name]

    if (!tool) {
      throw new Error(`Tool '${name}' not found in registry`)
    }

    try {
      const parsedArgs = JSON.parse(args)
      return await tool.execute(parsedArgs)
    } catch (error) {
      throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  return {
    tools,
    toolsForChatCompletion: tools,
    toolsForResponsesAPI: tools.map(toOpenAIResponseTool),
    registry,
    execute,
  }
}
