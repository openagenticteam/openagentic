import { HumanMessage } from "@langchain/core/messages"
import { ChatOpenAI } from "@langchain/openai"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { executeOpenAi, openai, openaiExecutableTool, openaiTool } from "../src/tools/openai"

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
      mockChatOpenAI.mockImplementation(() => ({
        invoke: mockInvoke,
      }))
    })

    describe("successful execution", () => {
      it("should execute with required parameters", async () => {
        const mockResponse = {
          content: "Test response",
          response_metadata: { tokenUsage: { total: 100 } },
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
          usage: { total: 100 },
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
    })
  })
})
