# Gemini Examples

This directory contains examples showing how OpenAgentic works seamlessly with various models (ex. OpenAI, Google's Gemini) through LangChain.

## Key Benefits

🔥 **Same Code, Different Provider**: OpenAgentic abstractions work identically across AI providers

✅ **No Provider Lock-in**: Switch between OpenAI, Gemini, and other providers with minimal code changes

🚀 **Provider-Agnostic**: Tool definitions and execution patterns remain consistent

## Prerequisites

```bash
# For Gemini:
npm install openagentic @langchain/google-genai

# For OpenAI:
npm install openagentic @langchain/openai
```

Set your API key:
```bash
# For Gemini:
export GOOGLE_API_KEY="your-google-api-key"

# For OpenAI:
export OPENAI_API_KEY="your-openai-api-key"
```

## Examples

### `simpleUsage.ts`
**5-line usage** - Shows identical interface across Gemini and OpenAI examples
```typescript
// For Gemini:
const model = new ChatGoogleGenerativeAI({ model: "gemini-1.5-pro" })

// For OpenAI:
const model = new ChatOpenAI({ model: "gpt-4", apiKey: OPENAI_API_KEY })

const ai = createAIWithTools(model, allTools)
const result = await ai.chat("Your prompt")
```

### `subsetUsage.ts`
**Tool subsets** - Use only specific tools with Gemini and OpenAI models
```typescript
const onlyAnthropic = createToolCollection([anthropicExecutableTool])
const ai = createAIWithTools(model, onlyAnthropic)
```

### `manualToolControl.ts`
**Manual control** - Fine-grained tool management for advanced users
```typescript
const modelWithTools = model.bindTools(allTools.toolsForChatCompletion)
const response = await modelWithTools.invoke([...])
```

### `providerComparison.ts`
**Side-by-side comparison** - Direct comparison of OpenAI vs Gemini using identical code
```typescript
const openaiAI = createAIWithTools(openaiModel, allTools)
const geminiAI = createAIWithTools(geminiModel, allTools)
// Same interface, different providers!
```

## Running Examples

```bash
# Simple usage
npx tsx examples/gemini/simpleUsage.ts
npx tsx examples/openai/simpleUsage.ts

# Subset usage
npx tsx examples/gemini/subsetUsage.ts
npx tsx examples/openai/subsetUsage.ts

# Advanced usage
npx tsx examples/advanced/manualToolControl.ts

# Provider comparison
npx tsx examples/advanced/providerComparison.ts
```

## Architecture Benefits

OpenAgentic's provider-agnostic design means:

1. **Tool definitions are universal** - Define once, use anywhere
2. **Execution logic is consistent** - Same patterns across providers
3. **Type safety is maintained** - Full TypeScript support regardless of provider
4. **Migration is simple** - Change one line to switch providers
5. **Testing is easier** - Mock different providers without changing logic

This demonstrates the power of OpenAgentic's abstraction layer!
