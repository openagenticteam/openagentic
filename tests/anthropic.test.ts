import { ChatAnthropic } from "@langchain/anthropic"
import { HumanMessage } from "@langchain/core/messages"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { anthropic, anthropicExecutableTool, anthropicTool, executeAnthropic } from "../src/tools/anthropic"
import type { CostTracker } from "../src/types"

// Mock LangChain modules
vi.mock("@langchain/anthropic", () => ({
  ChatAnthropic: vi.fn().mockImplementation(() => ({
    invoke: vi.fn(),
  })),
}))

vi.mock("@langchain/core/messages", () => ({
  HumanMessage: vi.fn().mockImplementation(content => ({ content })),
  AIMessage: vi.fn().mockImplementation(content => ({ content })),
}))

// Mock cost tracker for testing
const createMockCostTracker = (remainingBudget = 100, defaultMaxTokens = 4096): CostTracker => ({
  totalCostCents: 0,
  maxCostCents: 500,
  usageHistory: [],
  getRemainingBudgetCents: vi.fn().mockReturnValue(remainingBudget),
  canAfford: vi.fn().mockReturnValue(remainingBudget > 0),
  addUsage: vi.fn(),
  getDefaultMaxTokens: vi.fn().mockReturnValue(defaultMaxTokens),
  estimateCost: vi.fn().mockReturnValue(15), // 15 cents (Claude is more expensive)
  estimateQueryCost: vi.fn().mockReturnValue(20), // 20 cents
  canAffordQuery: vi.fn().mockReturnValue(remainingBudget > 20) as any,
  getSummary: vi.fn().mockReturnValue({
    totalCostCents: 35,
    maxCostCents: 500,
    remainingBudgetCents: remainingBudget,
    budgetUsedPercentage: 7,
    totalQueries: 2,
    orchestratorQueries: 1,
    toolQueries: 1,
  }),
})

describe("anthropic Tool", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("anthropicTool schema", () => {
    it("should have correct structure", () => {
      expect(anthropicTool).toEqual({
        type: "function",
        function: {
          name: "anthropic",
          description: "Use Anthropic Claude model to generate responses, analysis, and creative content with advanced reasoning capabilities",
          parameters: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "The message or prompt to send to the Anthropic Claude model",
              },
              apiKey: {
                type: "string",
                description: "The API key for accessing Anthropic Claude services",
              },
              modelName: {
                type: "string",
                description: "The Anthropic Claude model to use for generation",
                enum: ["claude-3-5-sonnet-20240620", "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
              },
              maxTokens: {
                type: "number",
                description: "Maximum number of tokens to generate (optional, will use cost-aware default if not specified)",
              },
            },
            required: ["message", "apiKey"],
            additionalProperties: false,
          },
          strict: true,
        },
      })
    })

    it("should have required function properties", () => {
      expect(anthropicTool).toHaveProperty("type", "function")
      expect(anthropicTool.function).toHaveProperty("name", "anthropic")
      expect(anthropicTool.function).toHaveProperty("description")
      expect(anthropicTool.function).toHaveProperty("parameters")
      expect(anthropicTool.function).toHaveProperty("strict", true)
    })

    it("should require message and apiKey parameters", () => {
      expect(anthropicTool.function.parameters.required).toEqual([
        "message",
        "apiKey",
      ])
    })

    it("should have additionalProperties set to false", () => {
      expect(anthropicTool.function.parameters.additionalProperties).toBe(false)
    })

    it("should have enum for modelName", () => {
      expect(anthropicTool.function.parameters.properties.modelName.enum).toEqual([
        "claude-3-5-sonnet-20240620",
        "claude-3-opus-20240229",
        "claude-3-sonnet-20240229",
        "claude-3-haiku-20240307",
      ])
    })

    it("should include maxTokens parameter for cost-aware usage", () => {
      expect(anthropicTool.function.parameters.properties.maxTokens).toEqual({
        type: "number",
        description: "Maximum number of tokens to generate (optional, will use cost-aware default if not specified)",
      })
    })
  })

  describe("anthropicExecutableTool", () => {
    it("should extend anthropicTool with execute function", () => {
      expect(anthropicExecutableTool.type).toBe(anthropicTool.type)
      expect(anthropicExecutableTool.function).toEqual(anthropicTool.function)
      expect(anthropicExecutableTool).toHaveProperty("execute")
      expect(typeof anthropicExecutableTool.execute).toBe("function")
    })
  })

  describe("legacy anthropic export", () => {
    it("should be the same as anthropicTool for backward compatibility", () => {
      expect(anthropic).toEqual(anthropicTool)
    })
  })

  describe("executeAnthropic function", () => {
    const mockInvoke = vi.fn()
    const mockChatAnthropic = ChatAnthropic as any

    beforeEach(() => {
      mockChatAnthropic.mockImplementation((config: any) => ({
        invoke: mockInvoke,
        config, // Store config for assertions
      }))
    })

    describe("successful execution without cost tracking", () => {
      it("should execute with required parameters", async () => {
        const mockResponse = {
          content: "Test response",
          response_metadata: { tokenUsage: { promptTokens: 75, completionTokens: 75, totalTokens: 150 } },
        }
        mockInvoke.mockResolvedValue(mockResponse)

        const result = await executeAnthropic({
          message: "Hello, Claude!",
          apiKey: "test-api-key",
          modelName: "claude-3-5-sonnet-20240620",
        })

        expect(ChatAnthropic).toHaveBeenCalledWith({
          apiKey: "test-api-key",
          modelName: "claude-3-5-sonnet-20240620",
        })

        expect(HumanMessage).toHaveBeenCalledWith("Hello, Claude!")
        expect(mockInvoke).toHaveBeenCalledWith([{ content: "Hello, Claude!" }])

        expect(result).toEqual({
          success: true,
          response: "Test response",
          model: "claude-3-5-sonnet-20240620",
          usage: { promptTokens: 75, completionTokens: 75, totalTokens: 150 },
        })
      })

      it("should use default model name when not provided", async () => {
        const mockResponse = {
          content: "Test response",
          response_metadata: { tokenUsage: null },
        }
        mockInvoke.mockResolvedValue(mockResponse)

        const result = await executeAnthropic({
          message: "Hello",
          apiKey: "test-key",
        })

        expect(ChatAnthropic).toHaveBeenCalledWith({
          apiKey: "test-key",
          modelName: "claude-3-5-sonnet-20240620", // Default model
        })

        expect(result).toEqual({
          success: true,
          response: "Test response",
          model: "claude-3-5-sonnet-20240620",
          usage: null,
        })
      })

      it("should handle explicit maxTokens parameter", async () => {
        const mockResponse = {
          content: "Test response",
          response_metadata: {},
        }
        mockInvoke.mockResolvedValue(mockResponse)

        await executeAnthropic({
          message: "Hello",
          apiKey: "test-key",
          modelName: "claude-3-opus-20240229",
          maxTokens: 1024,
        })

        expect(ChatAnthropic).toHaveBeenCalledWith({
          apiKey: "test-key",
          modelName: "claude-3-opus-20240229",
          maxTokens: 1024,
        })
      })
    })

    describe("cost tracking functionality", () => {
      it("should perform pre-execution cost check when cost tracker provided", async () => {
        const mockCostTracker = createMockCostTracker(100, 4096)
        ;(mockCostTracker.canAffordQuery as any).mockReturnValue(true)

        const mockResponse = {
          content: "Test response",
          response_metadata: { tokenUsage: { promptTokens: 60, completionTokens: 40, totalTokens: 100 } },
        }
        mockInvoke.mockResolvedValue(mockResponse)

        await executeAnthropic({
          message: "Hello Claude",
          apiKey: "test-key",
          modelName: "claude-3-5-sonnet-20240620",
        }, mockCostTracker)

        expect(mockCostTracker.canAffordQuery).toHaveBeenCalledWith("claude-3-5-sonnet-20240620", "Hello Claude".length, 4096)
      })

      it("should throw error when budget insufficient for query", async () => {
        const mockCostTracker = createMockCostTracker(5, 4096) // Very low budget
        ;(mockCostTracker.canAffordQuery as any).mockReturnValue(false)

        await expect(
          executeAnthropic({
            message: "Hello Claude",
            apiKey: "test-key",
            modelName: "claude-3-5-sonnet-20240620",
          }, mockCostTracker),
        ).rejects.toThrow("Insufficient budget: Query estimated to cost more than remaining budget of 5 cents")
      })

      it("should use cost-aware maxTokens when not explicitly provided", async () => {
        const mockCostTracker = createMockCostTracker(100, 2048)
        ;(mockCostTracker.canAffordQuery as any).mockReturnValue(true)

        const mockResponse = {
          content: "Test response",
          response_metadata: { tokenUsage: { promptTokens: 60, completionTokens: 40 } },
        }
        mockInvoke.mockResolvedValue(mockResponse)

        await executeAnthropic({
          message: "Hello",
          apiKey: "test-key",
          modelName: "claude-3-5-sonnet-20240620",
        }, mockCostTracker)

        expect(ChatAnthropic).toHaveBeenCalledWith({
          apiKey: "test-key",
          modelName: "claude-3-5-sonnet-20240620",
          maxTokens: 2048, // Should use cost tracker's default
        })
      })

      it("should track usage and add to cost tracker", async () => {
        const mockCostTracker = createMockCostTracker(100, 4096)
        ;(mockCostTracker.canAffordQuery as any).mockReturnValue(true)

        const mockResponse = {
          content: "Test response",
          response_metadata: {
            tokenUsage: {
              promptTokens: 60,
              completionTokens: 40,
              totalTokens: 100,
            },
          },
        }
        mockInvoke.mockResolvedValue(mockResponse)

        const result = await executeAnthropic({
          message: "Hello Claude",
          apiKey: "test-key",
          modelName: "claude-3-5-sonnet-20240620",
        }, mockCostTracker)

        // Verify cost estimation was called with correct values
        expect(mockCostTracker.estimateCost).toHaveBeenCalledWith("claude-3-5-sonnet-20240620", 60, 40)

        // Verify usage was recorded
        expect(mockCostTracker.addUsage).toHaveBeenCalledWith({
          model: "claude-3-5-sonnet-20240620",
          inputTokens: 60,
          outputTokens: 40,
          costCents: 15, // Mock return value
          timestamp: expect.any(Date),
          source: "tool",
          toolName: "anthropic",
        })

        // Verify cost tracker summary is included in result
        expect(result.costTracker).toEqual({
          totalCostCents: 35,
          maxCostCents: 500,
          remainingBudgetCents: 100,
          budgetUsedPercentage: 7,
          totalQueries: 2,
          orchestratorQueries: 1,
          toolQueries: 1,
        })
      })

      it("should handle missing token usage gracefully", async () => {
        const mockCostTracker = createMockCostTracker(100, 4096)
        ;(mockCostTracker.canAffordQuery as any).mockReturnValue(true)

        const mockResponse = {
          content: "Test response",
          response_metadata: {}, // No tokenUsage
        }
        mockInvoke.mockResolvedValue(mockResponse)

        const result = await executeAnthropic({
          message: "Hello",
          apiKey: "test-key",
          modelName: "claude-3-5-sonnet-20240620",
        }, mockCostTracker)

        // Should not call estimateCost or addUsage when no token usage available
        expect(mockCostTracker.estimateCost).not.toHaveBeenCalled()
        expect(mockCostTracker.addUsage).not.toHaveBeenCalled()

        // But should still include cost tracker summary
        expect(result.costTracker).toBeDefined()
      })

      it("should not include cost tracker in result when not provided", async () => {
        const mockResponse = {
          content: "Test response",
          response_metadata: { tokenUsage: { promptTokens: 50, completionTokens: 30 } },
        }
        mockInvoke.mockResolvedValue(mockResponse)

        const result = await executeAnthropic({
          message: "Hello",
          apiKey: "test-key",
          modelName: "claude-3-5-sonnet-20240620",
        })

        expect(result).not.toHaveProperty("costTracker")
      })
    })

    describe("error handling", () => {
      it("should throw detailed error for ChatAnthropic constructor errors", async () => {
        mockChatAnthropic.mockImplementation(() => {
          throw new Error("Invalid API key")
        })

        await expect(
          executeAnthropic({
            message: "Hello",
            apiKey: "invalid-key",
            modelName: "claude-3-5-sonnet-20240620",
          }),
        ).rejects.toThrow("Anthropic execution failed: Invalid API key")
      })

      it("should throw detailed error for model invocation errors", async () => {
        mockInvoke.mockRejectedValue(new Error("Model invocation failed"))

        await expect(
          executeAnthropic({
            message: "Hello",
            apiKey: "test-key",
            modelName: "claude-3-5-sonnet-20240620",
          }),
        ).rejects.toThrow("Anthropic execution failed: Model invocation failed")
      })

      it("should handle network errors", async () => {
        mockInvoke.mockRejectedValue(new Error("Network timeout"))

        await expect(
          executeAnthropic({
            message: "Hello",
            apiKey: "test-key",
            modelName: "claude-3-5-sonnet-20240620",
          }),
        ).rejects.toThrow("Anthropic execution failed: Network timeout")
      })

      it("should handle unknown errors", async () => {
        mockInvoke.mockRejectedValue("String error")

        await expect(
          executeAnthropic({
            message: "Hello",
            apiKey: "test-key",
            modelName: "claude-3-5-sonnet-20240620",
          }),
        ).rejects.toThrow("Anthropic execution failed: Unknown error")
      })

      it("should handle cost tracker budget exhaustion errors", async () => {
        const mockCostTracker = createMockCostTracker(0, 4096) // No budget
        ;(mockCostTracker.canAffordQuery as any).mockReturnValue(false)

        await expect(
          executeAnthropic({
            message: "Hello",
            apiKey: "test-key",
            modelName: "claude-3-5-sonnet-20240620",
          }, mockCostTracker),
        ).rejects.toThrow("Insufficient budget")
      })
    })

    describe("parameter validation scenarios", () => {
      it("should handle empty message", async () => {
        const mockResponse = {
          content: "Response to empty",
          response_metadata: {},
        }
        mockInvoke.mockResolvedValue(mockResponse)

        await executeAnthropic({
          message: "",
          apiKey: "test-key",
          modelName: "claude-3-5-sonnet-20240620",
        })

        expect(HumanMessage).toHaveBeenCalledWith("")
      })

      it("should handle very long messages", async () => {
        const mockResponse = {
          content: "Response to long message",
          response_metadata: {},
        }
        mockInvoke.mockResolvedValue(mockResponse)

        const longMessage = "a".repeat(10000)

        await executeAnthropic({
          message: longMessage,
          apiKey: "test-key",
          modelName: "claude-3-5-sonnet-20240620",
        })

        expect(HumanMessage).toHaveBeenCalledWith(longMessage)
      })

      it("should handle different Claude model names", async () => {
        const mockResponse = {
          content: "Test response",
          response_metadata: {},
        }
        mockInvoke.mockResolvedValue(mockResponse)

        await executeAnthropic({
          message: "Hello",
          apiKey: "test-key",
          modelName: "claude-3-opus-20240229",
        })

        expect(ChatAnthropic).toHaveBeenCalledWith({
          apiKey: "test-key",
          modelName: "claude-3-opus-20240229",
        })
      })

      it("should handle complex analysis messages", async () => {
        const mockResponse = {
          content: "Detailed analysis response",
          response_metadata: {},
        }
        mockInvoke.mockResolvedValue(mockResponse)

        const complexMessage = "Analyze this code: function test() { return 'hello'; }"

        await executeAnthropic({
          message: complexMessage,
          apiKey: "test-key",
          modelName: "claude-3-5-sonnet-20240620",
        })

        expect(HumanMessage).toHaveBeenCalledWith(complexMessage)
        expect(mockInvoke).toHaveBeenCalledWith([{ content: complexMessage }])
      })

      it("should handle missing response_metadata", async () => {
        const mockResponse = {
          content: "Test response",
          // No response_metadata
        }
        mockInvoke.mockResolvedValue(mockResponse)

        const result = await executeAnthropic({
          message: "Hello",
          apiKey: "test-key",
        })

        expect(result.usage).toBeNull()
      })
    })
  })
})
