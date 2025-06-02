import { HumanMessage } from "@langchain/core/messages"
import { ChatOpenAI } from "@langchain/openai"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { executeOpenAi, openai, openaiExecutableTool, openaiTool } from "../src/tools/openai"
import type { CostTracker } from "../src/types"

// Mock LangChain modules
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    invoke: vi.fn(),
  })),
}))

vi.mock("@langchain/core/messages", () => ({
  HumanMessage: vi.fn().mockImplementation(content => ({ content })),
  AIMessage: vi.fn().mockImplementation(content => ({ content })),
}))

// Mock cost tracker for testing
const createMockCostTracker = (remainingBudget = 100, defaultMaxTokens = 2048): CostTracker => ({
  totalCostCents: 0,
  maxCostCents: 500,
  usageHistory: [],
  getRemainingBudgetCents: vi.fn().mockReturnValue(remainingBudget),
  canAfford: vi.fn().mockReturnValue(remainingBudget > 0),
  addUsage: vi.fn(),
  getDefaultMaxTokens: vi.fn().mockReturnValue(defaultMaxTokens),
  estimateCost: vi.fn().mockReturnValue(10), // 10 cents
  estimateQueryCost: vi.fn().mockReturnValue(15), // 15 cents
  canAffordQuery: vi.fn().mockReturnValue(remainingBudget > 15) as any,
  getSummary: vi.fn().mockReturnValue({
    totalCostCents: 25,
    maxCostCents: 500,
    remainingBudgetCents: remainingBudget,
    budgetUsedPercentage: 5,
    totalQueries: 2,
    orchestratorQueries: 1,
    toolQueries: 1,
  }),
})

describe("openAI Tool", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("openaiTool schema", () => {
    it("should have correct structure", () => {
      expect(openaiTool).toEqual({
        type: "function",
        function: {
          name: "openai",
          description: "Use OpenAI model to generate responses for various tasks including text generation, analysis, and creative writing",
          parameters: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "The message or prompt to send to the OpenAI model",
              },
              apiKey: {
                type: "string",
                description: "The API key for accessing OpenAI services",
              },
              modelName: {
                type: "string",
                description: "The OpenAI model to use for generation",
                enum: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo", "gpt-4-1106-preview"],
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
      expect(openaiTool).toHaveProperty("type", "function")
      expect(openaiTool.function).toHaveProperty("name", "openai")
      expect(openaiTool.function).toHaveProperty("description")
      expect(openaiTool.function).toHaveProperty("parameters")
      expect(openaiTool.function).toHaveProperty("strict", true)
    })

    it("should require message and apiKey parameters", () => {
      expect(openaiTool.function.parameters.required).toEqual([
        "message",
        "apiKey",
      ])
    })

    it("should have additionalProperties set to false", () => {
      expect(openaiTool.function.parameters.additionalProperties).toBe(false)
    })

    it("should have enum for modelName", () => {
      expect(openaiTool.function.parameters.properties.modelName.enum).toEqual([
        "gpt-4",
        "gpt-4-turbo",
        "gpt-3.5-turbo",
        "gpt-4-1106-preview",
      ])
    })

    it("should include maxTokens parameter for cost-aware usage", () => {
      expect(openaiTool.function.parameters.properties.maxTokens).toEqual({
        type: "number",
        description: "Maximum number of tokens to generate (optional, will use cost-aware default if not specified)",
      })
    })
  })

  describe("openaiExecutableTool", () => {
    it("should extend openaiTool with execute function", () => {
      expect(openaiExecutableTool.type).toBe(openaiTool.type)
      expect(openaiExecutableTool.function).toEqual(openaiTool.function)
      expect(openaiExecutableTool).toHaveProperty("execute")
      expect(typeof openaiExecutableTool.execute).toBe("function")
    })
  })

  describe("legacy openai export", () => {
    it("should be the same as openaiTool for backward compatibility", () => {
      expect(openai).toEqual(openaiTool)
    })
  })

  describe("executeOpenAi function", () => {
    const mockInvoke = vi.fn()
    const mockChatOpenAI = ChatOpenAI as any

    beforeEach(() => {
      mockChatOpenAI.mockImplementation((config: any) => ({
        invoke: mockInvoke,
        config, // Store config for assertions
      }))
    })

    describe("successful execution without cost tracking", () => {
      it("should execute with required parameters", async () => {
        const mockResponse = {
          content: "Test response",
          response_metadata: { tokenUsage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 } },
        }
        mockInvoke.mockResolvedValue(mockResponse)

        const result = await executeOpenAi({
          message: "Hello, world!",
          apiKey: "test-api-key",
          modelName: "gpt-4",
        })

        expect(ChatOpenAI).toHaveBeenCalledWith({
          apiKey: "test-api-key",
          modelName: "gpt-4",
        })

        expect(HumanMessage).toHaveBeenCalledWith("Hello, world!")
        expect(mockInvoke).toHaveBeenCalledWith([{ content: "Hello, world!" }])

        expect(result).toEqual({
          success: true,
          response: "Test response",
          model: "gpt-4",
          usage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 },
        })
      })

      it("should use default model name when not provided", async () => {
        const mockResponse = {
          content: "Test response",
          response_metadata: { tokenUsage: null },
        }
        mockInvoke.mockResolvedValue(mockResponse)

        const result = await executeOpenAi({
          message: "Hello",
          apiKey: "test-key",
        })

        expect(ChatOpenAI).toHaveBeenCalledWith({
          apiKey: "test-key",
          modelName: "gpt-4-1106-preview", // Default model
        })

        expect(result).toEqual({
          success: true,
          response: "Test response",
          model: "gpt-4-1106-preview",
          usage: null,
        })
      })

      it("should handle explicit maxTokens parameter", async () => {
        const mockResponse = {
          content: "Test response",
          response_metadata: {},
        }
        mockInvoke.mockResolvedValue(mockResponse)

        await executeOpenAi({
          message: "Hello",
          apiKey: "test-key",
          modelName: "gpt-4",
          maxTokens: 512,
        })

        expect(ChatOpenAI).toHaveBeenCalledWith({
          apiKey: "test-key",
          modelName: "gpt-4",
          maxTokens: 512,
        })
      })
    })

    describe("cost tracking functionality", () => {
      it("should perform pre-execution cost check when cost tracker provided", async () => {
        const mockCostTracker = createMockCostTracker(100, 2048)
        ;(mockCostTracker.canAffordQuery as any).mockReturnValue(true)

        const mockResponse = {
          content: "Test response",
          response_metadata: { tokenUsage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 } },
        }
        mockInvoke.mockResolvedValue(mockResponse)

        await executeOpenAi({
          message: "Hello",
          apiKey: "test-key",
          modelName: "gpt-4",
        }, mockCostTracker)

        expect(mockCostTracker.canAffordQuery).toHaveBeenCalledWith("gpt-4", "Hello".length, 2048)
      })

      it("should throw error when budget insufficient for query", async () => {
        const mockCostTracker = createMockCostTracker(5, 2048) // Very low budget
        ;(mockCostTracker.canAffordQuery as any).mockReturnValue(false)

        await expect(
          executeOpenAi({
            message: "Hello",
            apiKey: "test-key",
            modelName: "gpt-4",
          }, mockCostTracker),
        ).rejects.toThrow("Insufficient budget: Query estimated to cost more than remaining budget of 5 cents")
      })

      it("should use cost-aware maxTokens when not explicitly provided", async () => {
        const mockCostTracker = createMockCostTracker(100, 1024)
        ;(mockCostTracker.canAffordQuery as any).mockReturnValue(true)

        const mockResponse = {
          content: "Test response",
          response_metadata: { tokenUsage: { promptTokens: 50, completionTokens: 30 } },
        }
        mockInvoke.mockResolvedValue(mockResponse)

        await executeOpenAi({
          message: "Hello",
          apiKey: "test-key",
          modelName: "gpt-4",
        }, mockCostTracker)

        expect(ChatOpenAI).toHaveBeenCalledWith({
          apiKey: "test-key",
          modelName: "gpt-4",
          maxTokens: 1024, // Should use cost tracker's default
        })
      })

      it("should prioritize explicit maxTokens over cost tracker default", async () => {
        const mockCostTracker = createMockCostTracker(100, 1024)
        ;(mockCostTracker.canAffordQuery as any).mockReturnValue(true)

        const mockResponse = {
          content: "Test response",
          response_metadata: { tokenUsage: { promptTokens: 50, completionTokens: 30 } },
        }
        mockInvoke.mockResolvedValue(mockResponse)

        await executeOpenAi({
          message: "Hello",
          apiKey: "test-key",
          modelName: "gpt-4",
          maxTokens: 512, // Explicit value
        }, mockCostTracker)

        expect(ChatOpenAI).toHaveBeenCalledWith({
          apiKey: "test-key",
          modelName: "gpt-4",
          maxTokens: 512, // Should use explicit value, not cost tracker default
        })
      })

      it("should track usage and add to cost tracker", async () => {
        const mockCostTracker = createMockCostTracker(100, 2048)
        ;(mockCostTracker.canAffordQuery as any).mockReturnValue(true)

        const mockResponse = {
          content: "Test response",
          response_metadata: {
            tokenUsage: {
              promptTokens: 50,
              completionTokens: 30,
              totalTokens: 80,
            },
          },
        }
        mockInvoke.mockResolvedValue(mockResponse)

        const result = await executeOpenAi({
          message: "Hello",
          apiKey: "test-key",
          modelName: "gpt-4",
        }, mockCostTracker)

        // Verify cost estimation was called with correct values
        expect(mockCostTracker.estimateCost).toHaveBeenCalledWith("gpt-4", 50, 30)

        // Verify usage was recorded
        expect(mockCostTracker.addUsage).toHaveBeenCalledWith({
          model: "gpt-4",
          inputTokens: 50,
          outputTokens: 30,
          costCents: 10, // Mock return value
          timestamp: expect.any(Date),
          source: "tool",
          toolName: "openai",
        })

        // Verify cost tracker summary is included in result
        expect(result.costTracker).toEqual({
          totalCostCents: 25,
          maxCostCents: 500,
          remainingBudgetCents: 100,
          budgetUsedPercentage: 5,
          totalQueries: 2,
          orchestratorQueries: 1,
          toolQueries: 1,
        })
      })

      it("should handle missing token usage gracefully", async () => {
        const mockCostTracker = createMockCostTracker(100, 2048)
        ;(mockCostTracker.canAffordQuery as any).mockReturnValue(true)

        const mockResponse = {
          content: "Test response",
          response_metadata: {}, // No tokenUsage
        }
        mockInvoke.mockResolvedValue(mockResponse)

        const result = await executeOpenAi({
          message: "Hello",
          apiKey: "test-key",
          modelName: "gpt-4",
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

        const result = await executeOpenAi({
          message: "Hello",
          apiKey: "test-key",
          modelName: "gpt-4",
        })

        expect(result).not.toHaveProperty("costTracker")
      })
    })

    describe("error handling", () => {
      it("should throw detailed error for ChatOpenAI constructor errors", async () => {
        mockChatOpenAI.mockImplementation(() => {
          throw new Error("Invalid API key")
        })

        await expect(
          executeOpenAi({
            message: "Hello",
            apiKey: "invalid-key",
            modelName: "gpt-4",
          }),
        ).rejects.toThrow("OpenAI execution failed: Invalid API key")
      })

      it("should throw detailed error for model invocation errors", async () => {
        mockInvoke.mockRejectedValue(new Error("Model invocation failed"))

        await expect(
          executeOpenAi({
            message: "Hello",
            apiKey: "test-key",
            modelName: "gpt-4",
          }),
        ).rejects.toThrow("OpenAI execution failed: Model invocation failed")
      })

      it("should handle network errors", async () => {
        mockInvoke.mockRejectedValue(new Error("Network timeout"))

        await expect(
          executeOpenAi({
            message: "Hello",
            apiKey: "test-key",
            modelName: "gpt-4",
          }),
        ).rejects.toThrow("OpenAI execution failed: Network timeout")
      })

      it("should handle unknown errors", async () => {
        mockInvoke.mockRejectedValue("String error")

        await expect(
          executeOpenAi({
            message: "Hello",
            apiKey: "test-key",
            modelName: "gpt-4",
          }),
        ).rejects.toThrow("OpenAI execution failed: Unknown error")
      })

      it("should handle cost tracker budget exhaustion errors", async () => {
        const mockCostTracker = createMockCostTracker(0, 2048) // No budget
        ;(mockCostTracker.canAffordQuery as any).mockReturnValue(false)

        await expect(
          executeOpenAi({
            message: "Hello",
            apiKey: "test-key",
            modelName: "gpt-4",
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

        await executeOpenAi({
          message: "",
          apiKey: "test-key",
          modelName: "gpt-4",
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

        await executeOpenAi({
          message: longMessage,
          apiKey: "test-key",
          modelName: "gpt-4",
        })

        expect(HumanMessage).toHaveBeenCalledWith(longMessage)
      })

      it("should handle different model names", async () => {
        const mockResponse = {
          content: "Test response",
          response_metadata: {},
        }
        mockInvoke.mockResolvedValue(mockResponse)

        await executeOpenAi({
          message: "Hello",
          apiKey: "test-key",
          modelName: "gpt-3.5-turbo",
        })

        expect(ChatOpenAI).toHaveBeenCalledWith({
          apiKey: "test-key",
          modelName: "gpt-3.5-turbo",
        })
      })

      it("should handle complex messages", async () => {
        const mockResponse = {
          content: "Complex response",
          response_metadata: {},
        }
        mockInvoke.mockResolvedValue(mockResponse)

        const complexMessage = "This is a complex message with special characters: @#$%^&*()"

        await executeOpenAi({
          message: complexMessage,
          apiKey: "test-key",
          modelName: "gpt-4",
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

        const result = await executeOpenAi({
          message: "Hello",
          apiKey: "test-key",
        })

        expect(result.usage).toBeNull()
      })
    })
  })
})
