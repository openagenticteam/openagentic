import { describe, expect, it } from "vitest"
import { createCostTracker } from "../src/utils/cost-tracker"

describe("Cost Tracker", () => {
  describe("initialization", () => {
    it("should create a cost tracker with correct initial values", () => {
      const tracker = createCostTracker(1000)
      expect(tracker.totalCostCents).toBe(0)
      expect(tracker.maxCostCents).toBe(1000)
      expect(tracker.usageHistory).toEqual([])
    })
  })

  describe("budget management", () => {
    it("should track remaining budget correctly", () => {
      const tracker = createCostTracker(1000)
      expect(tracker.getRemainingBudgetCents()).toBe(1000)

      tracker.addUsage({
        model: "gpt-4",
        inputTokens: 100,
        outputTokens: 50,
        costCents: 100,
        timestamp: new Date(),
        source: "orchestrator",
      })

      expect(tracker.getRemainingBudgetCents()).toBe(900)
    })

    it("should determine if cost is affordable", () => {
      const tracker = createCostTracker(1000)
      expect(tracker.canAfford(500)).toBe(true)
      expect(tracker.canAfford(1500)).toBe(false)
    })
  })

  describe("cost estimation", () => {
    it("should estimate cost for known models", () => {
      const tracker = createCostTracker(1000)
      const cost = tracker.estimateCost("gpt-4", 1000, 500)
      expect(cost).toBeGreaterThan(0)
    })

    it("should estimate query cost based on prompt length", () => {
      const tracker = createCostTracker(1000)
      const cost = tracker.estimateQueryCost("gpt-4", 1000)
      expect(cost).toBeGreaterThan(0)
    })

    it("should throw error for unknown models", () => {
      const tracker = createCostTracker(1000)
      expect(() => tracker.estimateCost("unknown-model", 100, 50)).toThrow("Unknown model")
    })
  })

  describe("usage tracking", () => {
    it("should track usage history", () => {
      const tracker = createCostTracker(1000)
      const usage = {
        model: "gpt-4",
        inputTokens: 100,
        outputTokens: 50,
        costCents: 100,
        timestamp: new Date(),
        source: "orchestrator",
      }

      tracker.addUsage(usage)
      expect(tracker.usageHistory).toHaveLength(1)
      expect(tracker.usageHistory[0]).toEqual(usage)
    })
  })

  describe("summary generation", () => {
    it("should generate accurate summary", () => {
      const tracker = createCostTracker(1000)
      
      // Add some usage records
      tracker.addUsage({
        model: "gpt-4",
        inputTokens: 100,
        outputTokens: 50,
        costCents: 100,
        timestamp: new Date(),
        source: "orchestrator",
      })

      tracker.addUsage({
        model: "gpt-4",
        inputTokens: 200,
        outputTokens: 100,
        costCents: 200,
        timestamp: new Date(),
        source: "tool",
        toolName: "openai",
      })

      const summary = tracker.getSummary()
      expect(summary.totalCostCents).toBe(300)
      expect(summary.maxCostCents).toBe(1000)
      expect(summary.remainingBudgetCents).toBe(700)
      expect(summary.budgetUsedPercentage).toBe(30)
      expect(summary.totalQueries).toBe(2)
      expect(summary.orchestratorQueries).toBe(1)
      expect(summary.toolQueries).toBe(1)
    })
  })

  describe("model-specific behavior", () => {
    it("should handle different models correctly", () => {
      const tracker = createCostTracker(1000)
      
      const gpt4Cost = tracker.estimateQueryCost("gpt-4", 1000)
      const gpt35Cost = tracker.estimateQueryCost("gpt-3.5-turbo", 1000)
      const claudeCost = tracker.estimateQueryCost("claude-3-5-sonnet-20240620", 1000)

      expect(gpt4Cost).toBeGreaterThan(gpt35Cost)
      expect(typeof claudeCost).toBe("number")
    })

    it("should respect model token limits", () => {
      const tracker = createCostTracker(1000)
      const maxTokens = tracker.getDefaultMaxTokens("gpt-4")
      expect(maxTokens).toBeLessThanOrEqual(8192)
    })
  })
})