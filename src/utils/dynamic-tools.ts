import toolDefinitions from "../configs/tool-definitions.json"
import type { ExecutableTool } from "../types"

import { createToolsFromConfigs } from "./tool-factory"
import type { ToolConfig } from "./tool-factory"

/**
 * Load tool configurations from JSON
 */
function loadToolConfigs(): ToolConfig[] {
  return toolDefinitions.tools as ToolConfig[]
}

/**
 * Create all tools dynamically from JSON configuration
 */
export function createDynamicTools(): ExecutableTool[] {
  const configs = loadToolConfigs()
  return createToolsFromConfigs(configs)
}

/**
 * Get a specific tool by name
 */
export function getDynamicTool(name: string): ExecutableTool | undefined {
  const configs = loadToolConfigs()
  const config = configs.find(c => c.name === name)

  if (!config) {
    return undefined
  }

  return createToolsFromConfigs([config])[0]
}

/**
 * Get all available tool names from configuration
 */
export function getAvailableToolNames(): string[] {
  const configs = loadToolConfigs()
  return configs.map(c => c.name)
}

/**
 * Add a new tool configuration at runtime
 */
export function addToolConfig(config: ToolConfig): ExecutableTool {
  // In a real implementation, you might want to persist this back to storage
  // For now, just create the tool dynamically
  return createToolsFromConfigs([config])[0]
}

// Export pre-built tools for immediate use
export const dynamicTools = createDynamicTools()

// Export individual tools for backward compatibility
export const dynamicOpenAI = getDynamicTool("openai")
export const dynamicAnthropic = getDynamicTool("anthropic")
export const dynamicGemini = getDynamicTool("gemini")
export const dynamicCohere = getDynamicTool("cohere")
export const dynamicHuggingFace = getDynamicTool("huggingface")
