import type { ExecutableTool, Tool, ToolCollection } from "../types"
import { createToolCollection } from "../utils"

import {
  anthropic, // legacy export
  anthropicExecutableTool,
  anthropicTool,
  executeAnthropic,
} from "./anthropic"
import {
  executeOpenAi,
  openai, // legacy export
  openaiExecutableTool,
  openaiTool,
} from "./openai"

// Individual tool exports
export {
  anthropicExecutableTool,
  anthropicTool,
  executeAnthropic,
  executeOpenAi,
  openaiExecutableTool,
  openaiTool,
}

// Legacy tool exports (backward compatibility)
export { anthropic, openai }

// Tool collections
export const allExecutableTools: ExecutableTool[] = [
  openaiExecutableTool,
  anthropicExecutableTool,
]

export const allTools: ToolCollection = createToolCollection(allExecutableTools)

// Legacy array export (backward compatibility)
export const tools: Tool[] = [openai, anthropic]

// Legacy execution function (backward compatibility)
export const executeTool = async (toolCall: any): Promise<any> => {
  return allTools.execute(toolCall)
}

// Export utility function for creating custom tool collections
export { createToolCollection }
