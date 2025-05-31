/**
 * OpenAI Subset Usage Example
 * Shows how to use specific tools with OpenAI models
 */

import { ChatOpenAI } from "@langchain/openai"
import {
  anthropicExecutableTool,
  createAIWithTools,
  createToolCollection,
} from "openagentic"

async function openaiSubsetExample() {
  const OPENAI_API_KEY = "your-openai-api-key"
  const model = new ChatOpenAI({
    model: "gpt-4",
    apiKey: OPENAI_API_KEY,
  })
  const onlyAnthropic = createToolCollection([anthropicExecutableTool])
  const ai = createAIWithTools(model, onlyAnthropic)
  const result = await ai.chat("Write a haiku about coding")
  console.log(result.response)
}

openaiSubsetExample().catch(console.error)
