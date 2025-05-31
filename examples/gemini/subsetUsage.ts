/**
 * Gemini Subset Usage Example
 * Shows how to use specific tools with Gemini models
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import {
  anthropicExecutableTool,
  createAIWithTools,
  createToolCollection,
} from "openagentic"

async function geminiSubsetExample() {
  const GOOGLE_API_KEY = "your-google-api-key"
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash",
    apiKey: GOOGLE_API_KEY,
  })

  // Use Gemini with only Anthropic tool
  const onlyAnthropic = createToolCollection([anthropicExecutableTool])
  const ai = createAIWithTools(model, onlyAnthropic)

  const result = await ai.chat("Use Anthropic to analyze the ethics of AI development")
  console.log("Gemini + Anthropic result:", result.response)
  console.log("Tools used:", result.toolCalls?.map((t: any) => t.toolCall?.name))
}

geminiSubsetExample().catch(console.error)
