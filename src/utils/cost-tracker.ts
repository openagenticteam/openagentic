import modelPricing from "./model_prices_and_context_window.json"
import type { CostTracker, UsageRecord, CostSummary } from "../types"

const DEFAULT_CHAR_TO_TOKEN_RATIO = 4
const MIN_TOKENS = 256

export function createCostTracker(maxCostCents: number): CostTracker {
  const usageHistory: UsageRecord[] = []
  let totalCostCents = 0

  function getRemainingBudgetCents(): number {
    return Math.max(0, maxCostCents - totalCostCents)
  }

  function canAfford(costCents: number): boolean {
    return getRemainingBudgetCents() >= costCents
  }

  function addUsage(record: UsageRecord): void {
    usageHistory.push(record)
    totalCostCents += record.costCents
  }

  function getModelPricing(model: string) {
    const pricing = (modelPricing as Record<string, any>)[model]
    if (!pricing) {
      throw new Error(`Unknown model: ${model}`)
    }
    return pricing
  }

  function getDefaultMaxTokens(model: string): number {
    const pricing = getModelPricing(model)
    return Math.min(pricing.max_output_tokens, pricing.max_tokens)
  }

  function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = getModelPricing(model)
    const inputCost = inputTokens * pricing.input_cost_per_token * 100 // Convert to cents
    const outputCost = outputTokens * pricing.output_cost_per_token * 100 // Convert to cents
    return Math.ceil(inputCost + outputCost)
  }

  function estimateQueryCost(model: string, promptLength: number, expectedOutputTokens?: number): number {
    const pricing = getModelPricing(model)
    const estimatedInputTokens = Math.ceil(promptLength / DEFAULT_CHAR_TO_TOKEN_RATIO)
    const estimatedOutputTokens = expectedOutputTokens || Math.min(
      pricing.max_output_tokens,
      Math.ceil(estimatedInputTokens * 1.5) // Assume 1.5x output length by default
    )
    return estimateCost(model, estimatedInputTokens, estimatedOutputTokens)
  }

  function canAffordQuery(model: string, promptLength: number, expectedOutputTokens?: number): boolean {
    try {
      const estimatedCost = estimateQueryCost(model, promptLength, expectedOutputTokens)
      return canAfford(estimatedCost)
    } catch (error) {
      // If we can't estimate cost (e.g., unknown model), assume we can afford it
      return true
    }
  }

  function getSummary(): CostSummary {
    const orchestratorQueries = usageHistory.filter(r => r.source === "orchestrator").length
    const toolQueries = usageHistory.filter(r => r.source === "tool").length

    return {
      totalCostCents,
      maxCostCents,
      remainingBudgetCents: getRemainingBudgetCents(),
      budgetUsedPercentage: (totalCostCents / maxCostCents) * 100,
      totalQueries: usageHistory.length,
      orchestratorQueries,
      toolQueries,
    }
  }

  return {
    totalCostCents,
    maxCostCents,
    usageHistory,
    getRemainingBudgetCents,
    canAfford,
    addUsage,
    getDefaultMaxTokens,
    estimateCost,
    estimateQueryCost,
    canAffordQuery,
    getSummary,
  }
}