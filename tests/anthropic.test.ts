import { ChatAnthropic } from "@langchain/anthropic"
import { HumanMessage } from "@langchain/core/messages"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createCostTracker } from "../src/utils/cost-tracker"
import { anthropic, anthropicExecutableTool, anthropicTool, executeAnthropic } from "../src/tools/anthropic"

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
      mockChatAnthropic.mockImplementation(() => ({
        invoke: mockInvoke,
      }))
    })

    describe("successful execution", () => {
      it("should execute with required parameters", async () => {
        const mockResponse = {
          content: "Test response",
          response_metadata: { tokenUsage: { total: 150 } },
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
          maxTokens: undefined,
        })

        expect(HumanMessage).toHaveBeenCalledWith("Hello, Claude!")
        expect(mockInvoke).toHaveBeenCalledWith([{ content: "Hello, Claude!" }])

        expect(result).toEqual({
          success: true,
          response: "Test response",
          model: "claude-3-5-sonnet-20240620",
          usage: { total: 150 },
          costTracker: undefined,
        })
      })

      it("should execute with cost tracking", async () => {
        const mockResponse = {
          content: "Test response",
          response_metadata: {
            tokenUsage: {
              promptTokens: 10,
              completionTokens: 20,
            },
          },
        }
        mockInvoke.mockResolvedValue(mockResponse)

        const costTracker = createCostTracker(1000)
        const result = await executeAnthropic({
          message: "Hello",
          apiKey: "test-key",
          modelName: "claude-3-5-sonnet-20240620",
        }, costTracker)

        expect(result.costTracker).toBeDefined()
        expect(result.costTracker?.totalQueries).toBe(1)
        expect(result.costTracker?.toolQueries).toBe(1)
      })

      it("should use cost-aware maxTokens when not provided", async () => {
        const mockResponse = {
          content: "Test response",
          response_metadata: { tokenUsage: null },
        }
        mockInvoke.mockResolvedValue(mockResponse)

        const costTracker = createCostTracker(1000)
        await executeAnthropic({
          message: "Hello",
          apiKey: "test-key",
          modelName: "claude-3-5-sonnet-20240620",
        }, costTracker)

        expect(ChatAnthropic).toHaveBeenCalledWith({
          apiKey: "test-key",
          modelName: "claude-3-5-sonnet-20240620",
          maxTokens: expect.any(Number),
        })
      })

      it("should respect explicit maxTokens over cost-aware defaults", async () => {
        const mockResponse = {
          content: "Test response",
          response_metadata: { tokenUsage: null },
        }
        mockInvoke.mockResolvedValue(mockResponse)

        const costTracker = createCostTracker(1000)
        await executeAnthropic({
          message: "Hello",
          apiKey: "test-key",
          modelName: "claude-3-5-sonnet-20240620",
          maxTokens: 100,
        }, costTracker)

        expect(ChatAnthropic).toHaveBeenCalledWith({
          apiKey: "test-key",
          modelName: "claude-3-5-sonnet-20240620",
          maxTokens: 100,
        })
      })
    })

    describe("error handling", () => {
      it("should throw error when budget insufficient", async () => {
        const costTracker = createCostTracker(1)
        await expect(
          executeAnthropic({
            message: "This is a very long message that would cost more than 1 cent",
            apiKey: "test-key",
            modelName: "claude-3-5-sonnet-20240620",
          }, costTracker),
        ).rejects.toThrow("Insufficient budget")
      })

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

      it("should handle API rate limiting errors", async () => {
        mockInvoke.mockRejectedValue(new Error("Rate limit exceeded"))

        await expect(
          executeAnthropic({
            message: "Hello",
            apiKey: "test-key",
            modelName: "claude-3-5-sonnet-20240620",
          }),
        ).rejects.toThrow("Anthropic execution failed: Rate limit exceeded")
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

        const longMessage = "x".repeat(50000)

        await executeAnthropic({
          message: longMessage,
          apiKey: "test-key",
          modelName: "claude-3-5-sonnet-20240620",
        })

        expect(HumanMessage).toHaveBeenCalledWith(longMessage)
      })
    })
  })
})