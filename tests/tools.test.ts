import { beforeEach, describe, expect, it, vi } from "vitest"

import { createCostTracker } from "../src/utils/cost-tracker"
import {
  allTools,
  anthropicExecutableTool,
  createToolCollection,
  executeTool,
  openaiExecutableTool,
  tools,
} from "../src/tools"
import { anthropicTool } from "../src/tools/anthropic"
import { openaiTool } from "../src/tools/openai"

// Mock the tool execution functions
vi.mock("../src/tools/anthropic", () => ({
  anthropicTool: {
    type: "function",
    function: {
      name: "anthropic",
      description: "Use Anthropic Claude model to generate responses",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "The message to send to the Anthropic model" },
          apiKey: { type: "string", description: "The API key for the Anthropic model" },
          modelName: { type: "string", description: "The model name to use" },
          maxTokens: { type: "number", description: "Maximum number of tokens to generate" },
        },
        required: ["message", "apiKey"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  anthropicExecutableTool: {
    type: "function",
    function: {
      name: "anthropic",
      description: "Use Anthropic Claude model to generate responses",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "The message to send to the Anthropic model" },
          apiKey: { type: "string", description: "The API key for the Anthropic model" },
          modelName: { type: "string", description: "The model name to use" },
          maxTokens: { type: "number", description: "Maximum number of tokens to generate" },
        },
        required: ["message", "apiKey"],
        additionalProperties: false,
      },
      strict: true,
    },
    execute: vi.fn(),
  },
  executeAnthropic: vi.fn(),
  anthropic: {
    type: "function",
    function: {
      name: "anthropic",
      description: "Use Anthropic Claude model to generate responses",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "The message to send to the Anthropic model" },
          apiKey: { type: "string", description: "The API key for the Anthropic model" },
          modelName: { type: "string", description: "The model name to use" },
          maxTokens: { type: "number", description: "Maximum number of tokens to generate" },
        },
        required: ["message", "apiKey"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
}))

vi.mock("../src/tools/openai", () => ({
  openaiTool: {
    type: "function",
    function: {
      name: "openai",
      description: "Use OpenAI model to generate responses",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "The message to send to the OpenAI model" },
          apiKey: { type: "string", description: "The API key for the OpenAI model" },
          modelName: { type: "string", description: "The model name to use" },
          maxTokens: { type: "number", description: "Maximum number of tokens to generate" },
        },
        required: ["message", "apiKey"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  openaiExecutableTool: {
    type: "function",
    function: {
      name: "openai",
      description: "Use OpenAI model to generate responses",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "The message to send to the OpenAI model" },
          apiKey: { type: "string", description: "The API key for the OpenAI model" },
          modelName: { type: "string", description: "The model name to use" },
          maxTokens: { type: "number", description: "Maximum number of tokens to generate" },
        },
        required: ["message", "apiKey"],
        additionalProperties: false,
      },
      strict: true,
    },
    execute: vi.fn(),
  },
  executeOpenAi: vi.fn(),
  openai: {
    type: "function",
    function: {
      name: "openai",
      description: "Use OpenAI model to generate responses",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "The message to send to the OpenAI model" },
          apiKey: { type: "string", description: "The API key for the OpenAI model" },
          modelName: { type: "string", description: "The model name to use" },
          maxTokens: { type: "number", description: "Maximum number of tokens to generate" },
        },
        required: ["message", "apiKey"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
}))

describe("tools System", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("legacy tools array", () => {
    it("should export an array containing openai and anthropic tools", () => {
      expect(tools).toBeDefined()
      expect(Array.isArray(tools)).toBe(true)
      expect(tools).toHaveLength(2)
    })

    it("should contain tools with correct structure", () => {
      tools.forEach((tool) => {
        expect(tool).toHaveProperty("type", "function")
        expect(tool).toHaveProperty("function")
        expect(tool.function).toHaveProperty("name")
        expect(tool.function).toHaveProperty("description")
        expect(tool.function).toHaveProperty("parameters")
        expect(tool.function.parameters).toHaveProperty("type", "object")
        expect(tool.function.parameters).toHaveProperty("properties")
        expect(tool.function.parameters).toHaveProperty("required")
        expect(tool.function.parameters).toHaveProperty("additionalProperties", false)
        expect(tool.function).toHaveProperty("strict", true)
      })
    })

    it("should contain the correct tool names", () => {
      const toolNames = tools.map(tool => tool.function.name)
      expect(toolNames).toContain("openai")
      expect(toolNames).toContain("anthropic")
    })
  })

  describe("allTools ToolCollection", () => {
    it("should have all required properties", () => {
      expect(allTools).toHaveProperty("tools")
      expect(allTools).toHaveProperty("toolsForChatCompletion")
      expect(allTools).toHaveProperty("toolsForResponsesAPI")
      expect(allTools).toHaveProperty("registry")
      expect(allTools).toHaveProperty("execute")
    })

    it("should have tools array with correct length", () => {
      expect(Array.isArray(allTools.tools)).toBe(true)
      expect(allTools.tools).toHaveLength(2)
    })

    it("should have toolsForChatCompletion in correct format", () => {
      expect(Array.isArray(allTools.toolsForChatCompletion)).toBe(true)
      expect(allTools.toolsForChatCompletion).toHaveLength(2)

      allTools.toolsForChatCompletion.forEach((tool) => {
        expect(tool).toHaveProperty("type", "function")
        expect(tool).toHaveProperty("function")
      })
    })

    it("should have toolsForResponsesAPI in correct format", () => {
      expect(Array.isArray(allTools.toolsForResponsesAPI)).toBe(true)
      expect(allTools.toolsForResponsesAPI).toHaveLength(2)

      allTools.toolsForResponsesAPI.forEach((tool) => {
        expect(tool).toHaveProperty("type", "function")
        expect(tool).toHaveProperty("function")
      })
    })

    it("should have registry with correct tool names", () => {
      expect(typeof allTools.registry).toBe("object")
      expect(allTools.registry).toHaveProperty("openai")
      expect(allTools.registry).toHaveProperty("anthropic")

      // Registry should contain executable tools
      expect(allTools.registry.openai).toHaveProperty("execute")
      expect(allTools.registry.anthropic).toHaveProperty("execute")
    })

    it("should have execute function",() => {
      expect(typeof allTools.execute).toBe("function")
    })
  })

  describe("createToolCollection", () => {
    it("should create a tool collection from executable tools", () => {
      const customCollection = createToolCollection([openaiExecutableTool])

      expect(customCollection).toHaveProperty("tools")
      expect(customCollection).toHaveProperty("toolsForChatCompletion")
      expect(customCollection).toHaveProperty("toolsForResponsesAPI")
      expect(customCollection).toHaveProperty("registry")
      expect(customCollection).toHaveProperty("execute")

      expect(customCollection.tools).toHaveLength(1)
      expect(customCollection.tools[0].function.name).toBe("openai")
    })

    it("should create registry with correct mappings", () => {
      const customCollection = createToolCollection([anthropicExecutableTool])

      expect(customCollection.registry).toHaveProperty("anthropic")
      expect(customCollection.registry.anthropic).toHaveProperty("execute")
    })
  })

  describe("tool execution", () => {
    const createMockToolCall = (name: string, args: Record<string, any>) => ({
      function: {
        name,
        arguments: JSON.stringify(args),
      },
    })

    describe("allTools.execute", () => {
      it("should execute openai tool successfully", async () => {
        const mockResponse = {
          success: true,
          response: "OpenAI response",
          model: "gpt-4",
          usage: null,
          costTracker: undefined,
        }
        vi.mocked(openaiExecutableTool.execute).mockResolvedValue(mockResponse)

        const args = {
          message: "Hello",
          apiKey: "test-key",
          modelName: "gpt-4",
        }
        const toolCall = createMockToolCall("openai", args)

        const result = await allTools.execute(toolCall)

        expect(openaiExecutableTool.execute).toHaveBeenCalledWith(args, undefined)
        expect(result).toBe(mockResponse)
      })

      it("should execute openai tool with cost tracking", async () => {
        const costTracker = createCostTracker(1000)
        const mockResponse = {
          success: true,
          response: "OpenAI response",
          model: "gpt-4",
          usage: { promptTokens: 10, completionTokens: 20 },
          costTracker: costTracker.getSummary(),
        }
        vi.mocked(openaiExecutableTool.execute).mockResolvedValue(mockResponse)

        const args = {
          message: "Hello",
          apiKey: "test-key",
          modelName: "gpt-4",
        }
        const toolCall = createMockToolCall("openai", args)

        const result = await allTools.execute(toolCall, costTracker)

        expect(openaiExecutableTool.execute).toHaveBeenCalledWith(args, costTracker)
        expect(result.costTracker).toBeDefined()
      })

      it("should execute anthropic tool successfully", async () => {
        const mockResponse = {
          success: true,
          response: "Anthropic response",
          model: "claude-3-5-sonnet-20240620",
          usage: null,
          costTracker: undefined,
        }
        vi.mocked(anthropicExecutableTool.execute).mockResolvedValue(mockResponse)

        const args = {
          message: "Hello",
          apiKey: "test-key",
          modelName: "claude-3-5-sonnet-20240620",
        }
        const toolCall = createMockToolCall("anthropic", args)

        const result = await allTools.execute(toolCall)

        expect(anthropicExecutableTool.execute).toHaveBeenCalledWith(args, undefined)
        expect(result).toBe(mockResponse)
      })

      it("should execute anthropic tool with cost tracking", async () => {
        const costTracker = createCostTracker(1000)
        const mockResponse = {
          success: true,
          response: "Anthropic response",
          model: "claude-3-5-sonnet-20240620",
          usage: { promptTokens: 10, completionTokens: 20 },
          costTracker: costTracker.getSummary(),
        }
        vi.mocked(anthropicExecutableTool.execute).mockResolvedValue(mockResponse)

        const args = {
          message: "Hello",
          apiKey: "test-key",
          modelName: "claude-3-5-sonnet-20240620",
        }
        const toolCall = createMockToolCall("anthropic", args)

        const result = await allTools.execute(toolCall, costTracker)

        expect(anthropicExecutableTool.execute).toHaveBeenCalledWith(args, costTracker)
        expect(result.costTracker).toBeDefined()
      })

      it("should handle unknown tool names", async () => {
        const toolCall = createMockToolCall("unknown", {})

        await expect(allTools.execute(toolCall)).rejects.toThrow("Tool 'unknown' not found in registry")
      })

      it("should handle invalid JSON arguments", async () => {
        const toolCall = {
          function: {
            name: "openai",
            arguments: "invalid json {",
          },
        }

        await expect(allTools.execute(toolCall)).rejects.toThrow("Tool execution failed:")
      })

      it("should handle tool execution errors", async () => {
        const error = new Error("Tool execution failed")
        vi.mocked(openaiExecutableTool.execute).mockRejectedValue(error)

        const args = {
          message: "Hello",
          apiKey: "test-key",
          modelName: "gpt-4",
        }
        const toolCall = createMockToolCall("openai", args)

        await expect(allTools.execute(toolCall)).rejects.toThrow("Tool execution failed: Tool execution failed")
      })
    })

    describe("legacy executeTool", () => {
      it("should delegate to allTools.execute", async () => {
        const mockResponse = {
          success: true,
          response: "Test response",
          model: "gpt-4",
          usage: null,
          costTracker: undefined,
        }

        // Mock allTools.execute
        const originalExecute = allTools.execute
        allTools.execute = vi.fn().mockResolvedValue(mockResponse)

        const toolCall = createMockToolCall("openai", { message: "Hello", apiKey: "test-key" })
        const result = await executeTool(toolCall)

        expect(allTools.execute).toHaveBeenCalledWith(toolCall, undefined)
        expect(result).toBe(mockResponse)

        // Restore original
        allTools.execute = originalExecute
      })

      it("should delegate to allTools.execute with cost tracking", async () => {
        const costTracker = createCostTracker(1000)
        const mockResponse = {
          success: true,
          response: "Test response",
          model: "gpt-4",
          usage: null,
          costTracker: costTracker.getSummary(),
        }

        // Mock allTools.execute
        const originalExecute = allTools.execute
        allTools.execute = vi.fn().mockResolvedValue(mockResponse)

        const toolCall = createMockToolCall("openai", { message: "Hello", apiKey: "test-key" })
        const result = await executeTool(toolCall, costTracker)

        expect(allTools.execute).toHaveBeenCalledWith(toolCall, costTracker)
        expect(result.costTracker).toBeDefined()

        // Restore original
        allTools.execute = originalExecute
      })
    })
  })

  describe("individual tool exports", () => {
    it("should export openaiTool", () => {
      expect(openaiTool).toHaveProperty("type", "function")
      expect(openaiTool.function).toHaveProperty("name", "openai")
    })

    it("should export anthropicTool", () => {
      expect(anthropicTool).toHaveProperty("type", "function")
      expect(anthropicTool.function).toHaveProperty("name", "anthropic")
    })

    it("should export executable tools", () => {
      expect(openaiExecutableTool).toHaveProperty("execute")
      expect(anthropicExecutableTool).toHaveProperty("execute")
    })
  })
})