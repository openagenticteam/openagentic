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
import { createAIWithTools, allTools } from "openagentic"

const model = new ChatOpenAI({ model: "gpt-4", apiKey: "your-key" })
const ai = createAIWithTools(model, allTools)
const result = await ai.chat("Use OpenAI to explain quantum physics")
console.log(result.response)
```

### Using Tool Subsets

```typescript
import { createAIWithTools, createToolCollection, openaiExecutableTool } from "openagentic"

const model = new ChatOpenAI({ model: "gpt-4", apiKey: "your-key" })
const onlyOpenAI = createToolCollection([openaiExecutableTool])
const ai = createAIWithTools(model, onlyOpenAI)
const result = await ai.chat("Write a haiku about coding")
```

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

- OpenAI: Executes prompts using OpenAI models
- Anthropic: Executes prompts using Anthropic Claude models

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
collection.tools                   // Standard Tool[]
collection.toolsForChatCompletion  // Chat Completions format
collection.toolsForResponsesAPI    // Responses API format
collection.registry                // Tool registry for execution
collection.execute                 // Execution function
```

## Provider Support

OpenAgentic works with **any AI provider** that supports LangChain's interface:

### 🔥 **Same Code, Different Providers**

```typescript
import { ChatOpenAI } from "@langchain/openai"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { createAIWithTools, allTools } from "openagentic"

// Same abstraction works for both!
const openaiAI = createAIWithTools(new ChatOpenAI({ model: "gpt-4" }), allTools)
const geminiAI = createAIWithTools(new ChatGoogleGenerativeAI({ model: "gemini-1.5-pro" }), allTools)

// Identical usage
const result1 = await openaiAI.chat("Your prompt")  // OpenAI
const result2 = await geminiAI.chat("Your prompt")  // Gemini - same interface!
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
