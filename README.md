# OpenAgentic SDK

A flexible, extensible AI tools library for TypeScript/JavaScript applications. OpenAgentic provides a standardized way to define, manage, and execute AI tools across different providers like OpenAI, Anthropic, and more.

## Features

- **Provider Agnostic**: Works with OpenAI, Anthropic, and other AI providers
- **Type Safety**: Full TypeScript support with strict typing
- **Flexible Architecture**: Use all tools or selectively import only what you need
- **Multiple API Support**: Compatible with both OpenAI Chat Completions and Responses APIs
- **Easy Extensibility**: Simple to add new tools and providers
- **Tool Execution**: Built-in registry system for executing tools
- **Standard Compliant**: Follows OpenAI function calling standards

## Installation

```bash
npm install openagentic
```

## Quick Start

> See `examples` directory for more details

### Super Simple Usage (5 lines!)

```typescript
import { ChatOpenAI } from "@langchain/openai"
import { allToolsEnhanced, createAIWithTools } from "openagentic"

const model = new ChatOpenAI({ model: "gpt-4", apiKey: "your-key" })
const ai = createAIWithTools(model, allToolsEnhanced)
const result = await ai.chat("Use OpenAI to explain quantum physics")
console.log(result.response)
```

### Using Tool Subsets

```typescript
import { createAIWithTools, createToolCollection, getDynamicTool } from "openagentic"

const model = new ChatOpenAI({ model: "gpt-4", apiKey: "your-key" })

// Get specific tools from the dynamic system
const openaiTool = getDynamicTool("openai")
const geminiTool = getDynamicTool("gemini")

const customCollection = createToolCollection([openaiTool, geminiTool])
const ai = createAIWithTools(model, customCollection)
const result = await ai.chat("Write a haiku about coding")
```

> **💡 Pro Tip**: Use `allToolsEnhanced` instead of `allTools` to get access to all tools including the new dynamic ones (OpenAI, Anthropic, Gemini, Cohere, HuggingFace). The original `allTools` is kept for backward compatibility.

### Advanced Usage (Manual Control)

If you need more control over the tool execution process:

```typescript
import { ChatOpenAI } from "@langchain/openai"
import { allTools } from "openagentic"

const model = new ChatOpenAI({
  model: "gpt-4",
  apiKey: "your-api-key",
})

// Bind all available tools
const modelWithTools = model.bindTools(allTools.toolsForChatCompletion)

const response = await modelWithTools.invoke([
  { role: "user", content: "Generate a weather report using AI." }
])
```

## Architecture Overview

OpenAgentic uses a modular architecture that separates tool definitions from execution logic:

- **Tool Definitions**: Pure schema definitions (no execution logic)
- **Executable Tools**: Tools combined with execution functions
- **Tool Registry**: Maps tool names to executable tools
- **Format Converters**: Utilities to convert tools to provider-specific formats

## Tool Types

### Standard Tool
```typescript
interface Tool {
  type: "function"
  function: {
    name: string
    description: string
    parameters: FunctionParameters
    strict?: boolean
  }
}
```

### Executable Tool
```typescript
interface ExecutableTool extends Tool {
  execute: (args: any) => Promise<any>
}
```

## API Compatibility

### OpenAI Chat Completions API
```typescript
import { allTools } from "openagentic"

// Use with ChatOpenAI for standard function calling
const modelWithTools = model.bindTools(allTools.toolsForChatCompletion)
```

### OpenAI Responses API
```typescript
import { OpenAIClient } from "@langchain/openai"
import { allTools } from "openagentic"

const client = new OpenAIClient({ apiKey: "your-key" })

const response = await client.responses.create({
  model: "gpt-4",
  input: [{ role: "user", content: "Hello" }],
  tools: allTools.toolsForResponsesAPI, // Different format for Responses API
})
```

## Tool Execution

```typescript
import { allTools } from "openagentic"

// Execute a tool call
const result = await allTools.execute({
  function: {
    name: "openai",
    arguments: JSON.stringify({
      message: "Hello world",
      apiKey: "your-key",
      modelName: "gpt-4"
    })
  }
})
```

## Available Tools

### Built-in Tools
- **OpenAI**: Executes prompts using OpenAI models (gpt-4, gpt-3.5-turbo, etc.)
- **Anthropic**: Executes prompts using Anthropic Claude models
- **Gemini**: Google's Gemini models (via JSON configuration)
- **Cohere**: Cohere's command models (via JSON configuration)
- **Hugging Face**: Various HuggingFace models (via JSON configuration)

### Dynamic Tool System

OpenAgentic now features a **dynamic tool system** that allows you to add new tools with minimal code changes. Most tools can be added by simply updating a JSON configuration file!

```typescript
import { allToolsEnhanced, getAvailableToolNames } from "openagentic"

// See all available tools
console.log(getAvailableToolNames())
// Output: ['openai', 'anthropic', 'gemini', 'cohere', 'huggingface']

// Use enhanced collection with all dynamic tools
const ai = createAIWithTools(model, allToolsEnhanced)
```

## Adding New Tools

### 🚀 Method 1: LangChain-Compatible Tools (Recommended)

For tools supported by LangChain, you only need to add a JSON configuration:

#### Step 1: Add to `src/configs/tool-definitions.json`

```json
{
  "tools": [
    {
      "name": "palm",
      "description": "Use Google PaLM model for text generation and analysis",
      "provider": "google",
      "modelClass": "ChatGooglePaLM",
      "defaultModel": "text-bison-001",
      "modelOptions": [
        "text-bison-001",
        "chat-bison-001",
        "text-bison-32k"
      ],
      "customParameters": {
        "temperature": {
          "type": "number",
          "description": "Sampling temperature",
          "minimum": 0,
          "maximum": 1
        }
      }
    }
  ]
}
```

#### Step 2: Install LangChain integration

```bash
npm install @langchain/google-palm
```

#### Step 3: Update model registry (if needed)

```typescript
// In src/utils/tool-factory.ts - add to MODEL_CLASSES if it's a standard LangChain class
import { ChatGooglePaLM } from "@langchain/google-palm"

const MODEL_CLASSES = {
  ChatOpenAI,
  ChatAnthropic,
  ChatGooglePaLM, // Add new model class
} as const
```

#### Step 4: Use immediately!

```typescript
import { getDynamicTool } from "openagentic"

const palmTool = getDynamicTool("palm")
// Tool is ready to use with full cost tracking and error handling
```

**That's it!** Your new tool has:
- ✅ Full cost tracking integration
- ✅ Consistent error handling
- ✅ Type safety
- ✅ Automatic testing compatibility
- ✅ Zero code duplication

### 🔧 Method 2: Custom Tools (Advanced)

For tools that aren't LangChain-compatible or need custom logic:

```typescript
import { createExecutableTool } from "openagentic"
import type { ToolConfig } from "openagentic"

const customToolConfig: ToolConfig = {
  name: "weather-api",
  description: "Get real-time weather data for any location",
  provider: "custom",
  modelClass: "custom",
  defaultModel: "weather-v1",
  modelOptions: ["weather-v1", "weather-premium"],
  customParameters: {
    units: {
      type: "string",
      enum: ["celsius", "fahrenheit"],
      description: "Temperature units"
    }
  },
  customExecutor: async (params, costTracker) => {
    const { message, units = "celsius", apiKey } = params

    // Cost tracking integration
    if (costTracker) {
      const estimatedCost = 2 // 2 cents per API call
      if (costTracker.getRemainingBudgetCents() < estimatedCost) {
        throw new Error("Insufficient budget for weather API call")
      }
    }

    // Your custom API logic
    const weatherData = await fetch(`https://api.weather.com/v1/current`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      // ... your API call
    })

    // Track actual usage
    if (costTracker) {
      costTracker.addUsage({
        model: "weather-v1",
        inputTokens: 0,
        outputTokens: 0,
        costCents: 2,
        timestamp: new Date(),
        source: "tool",
        toolName: "weather-api"
      })
    }

    return {
      success: true,
      response: `Weather for ${message}: ${weatherData.temperature}°${units.charAt(0).toUpperCase()}`,
      model: "weather-v1",
      usage: null,
      costTracker: costTracker?.getSummary()
    }
  }
}

// Create and use the tool
const weatherTool = createExecutableTool(customToolConfig)
```

### ⚠️ Method 3: MCP Tools (Not Yet Supported)

**Model Context Protocol (MCP) tools are not currently supported**, but here's what we'd need to add:

#### Current MCP Format (OpenAI):
```
// This format is NOT yet supported
{
  "type": "mcp",
  "server_label": "deepwiki",
  "server_url": "https://mcp.deepwiki.com/mcp",
  "require_approval": "never"
}
```

#### What we'd need to implement:

1. **New MCP Tool Type**:
```typescript
// Would need to add to src/types.ts
interface MCPTool {
  type: "mcp"
  server_label: string
  server_url: string
  require_approval: "never" | "always" | "prompt"
}
```

2. **MCP Execution Engine**:
```typescript
// Would need MCP client integration
import { MCPClient } from "@mcp/client" // Hypothetical

const executeMCPTool = async (tool: MCPTool, params: any) => {
  const client = new MCPClient(tool.server_url)
  return await client.execute(params)
}
```

3. **Updated Tool Factory**:
```typescript
// Add MCP support to createExecutableTool
if (config.type === "mcp") {
  return createMCPExecutableTool(config)
}
```

**To request MCP support**, please [open an issue](https://github.com/yourusername/openagentic/issues) with your use case!

## Tool Development Best Practices

### 🎯 Which Method Should I Use?

| Tool Type | Recommended Method | Effort Level |
|-----------|-------------------|--------------|
| **LangChain models** | JSON Config | ⭐ (5 minutes) |
| **REST APIs** | Custom Executor | ⭐⭐ (30 minutes) |
| **MCP tools** | Custom Executor | ⭐⭐⭐ (30+ minutes) |
| **Custom integrations** | Custom Executor | ⭐⭐⭐ (30+ minutes) |

## Creating Custom Tools

### 1. Define the Tool Schema
```typescript
import type { Tool } from "openagentic"

export const weatherTool: Tool = {
  type: "function",
  function: {
    name: "get_weather",
    description: "Get current weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "City and country, e.g. Paris, France"
        },
        units: {
          type: "string",
          enum: ["celsius", "fahrenheit"],
          description: "Temperature units"
        }
      },
      required: ["location"],
      additionalProperties: false,
    },
    strict: true,
  },
}
```

### 2. Create the Execution Function
```typescript
export const executeWeather = async ({ location, units = "celsius" }) => {
  // Your weather API logic here
  const weatherData = await fetchWeatherAPI(location, units)
  return weatherData
}
```

### 3. Combine into Executable Tool
```typescript
import type { ExecutableTool } from "openagentic"

export const weatherExecutableTool: ExecutableTool = {
  ...weatherTool,
  execute: executeWeather,
}
```

### 4. Use Your Custom Tool
```typescript
import { createToolCollection } from "openagentic"

const customTools = createToolCollection([weatherExecutableTool])

// Use with any compatible AI provider
const modelWithTools = model.bindTools(customTools.toolsForChatCompletion)
```

## Utility Functions

### Format Converters

```typescript
import { toOpenAIFunction, toOpenAIResponseTool } from "openagentic"

// Convert to Chat Completions format
const chatTool = toOpenAIFunction(myTool)

// Convert to Responses API format
const responsesTool = toOpenAIResponseTool(myTool)
```

### Tool Collections

```typescript
import { createToolCollection } from "openagentic"

const collection = createToolCollection([tool1, tool2])

// Access different formats
collection.tools // Standard Tool[]
collection.toolsForChatCompletion // Chat Completions format
collection.toolsForResponsesAPI // Responses API format
collection.registry // Tool registry for execution
collection.execute // Execution function
```

## Provider Support

OpenAgentic works with **any AI provider** that supports LangChain's interface:

### 🔥 **Same Code, Different Providers**

```typescript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatOpenAI } from "@langchain/openai"
import { allTools, createAIWithTools } from "openagentic"

// Same abstraction works for both!
const openaiAI = createAIWithTools(new ChatOpenAI({ model: "gpt-4" }), allTools)
const geminiAI = createAIWithTools(new ChatGoogleGenerativeAI({ model: "gemini-1.5-pro" }), allTools)

// Identical usage
const result1 = await openaiAI.chat("Your prompt") // OpenAI
const result2 = await geminiAI.chat("Your prompt") // Gemini - same interface!
```

### Supported Providers
- **OpenAI** (`gpt-4`, `gpt-3.5-turbo`, etc.)
- **Google Gemini** (`gemini-1.5-pro`, `gemini-1.5-flash`, etc.)
- **Anthropic Claude** (via our built-in tools)
- **Any LangChain-compatible provider**

## Examples

See the `examples/` directory for complete working examples:

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details (TODO: coming soon!).

## License

MIT License - see [LICENSE](LICENSE) file for details.
