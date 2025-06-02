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
  execute: (args: any, costTracker?: CostTracker) => Promise<any>
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
  execute: (toolCall: ToolCall, costTracker?: CostTracker) => Promise<any>
}

// Legacy type for backward compatibility
export type OATool = Tool & {
  example?: string
}

// Cost-aware types
export interface ModelCostConfig {
  max_tokens: number
  max_input_tokens: number
  max_output_tokens: number
  input_cost_per_token: number
  output_cost_per_token: number
  litellm_provider: string
  mode: string
  supports_function_calling?: boolean
  supports_prompt_caching?: boolean
  supports_system_messages?: boolean
  supports_tool_choice?: boolean
}

export interface CostTracker {
  totalCostCents: number
  maxCostCents: number
  usageHistory: UsageRecord[]
  getRemainingBudgetCents(): number
  canAfford(estimatedCostCents: number): boolean
  addUsage(record: UsageRecord): void
  getDefaultMaxTokens(model: string): number
  estimateCost(model: string, inputTokens: number, outputTokens?: number): number
  estimateQueryCost(model: string, promptLength: number, expectedOutputTokens?: number): number
  canAffordQuery(model: string, promptLength: number, expectedOutputTokens?: number): boolean
  getSummary(): CostSummary
}

export interface UsageRecord {
  model: string
  inputTokens: number
  outputTokens: number
  costCents: number
  timestamp: Date
  source: "orchestrator" | "tool"
  toolName?: string
}

// Backward compatibility: CostSummary interface
export interface CostSummary {
  totalCostCents: number
  maxCostCents: number
  remainingBudgetCents: number
  budgetUsedPercentage: number
  totalQueries: number
  orchestratorQueries: number
  toolQueries: number
}

export interface CostAwareOptions {
  maxCostCents?: number
  conservativeMode?: boolean
}
