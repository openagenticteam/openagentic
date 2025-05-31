/**
 * Simple Gemini Usage Example - 5 lines!
 * This shows that OpenAgentic works identically with Gemini as with OpenAI
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { allTools, createAIWithTools } from "openagentic"

async function simpleGeminiExample() {
  const GOOGLE_API_KEY = "your-google-api-key"
  // Identical usage to OpenAI - just different model!
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-pro",
    apiKey: GOOGLE_API_KEY,
  })
  const ai = createAIWithTools(model, allTools)
  const result = await ai.chat("Use OpenAI to write a haiku about the ocean")
  console.log(result.response)

  // Same abstraction, different provider - that's the power of OpenAgentic!
}

simpleGeminiExample().catch(console.error)
