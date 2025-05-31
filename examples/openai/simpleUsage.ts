import { ChatOpenAI } from "@langchain/openai"
import { allTools, createAIWithTools } from "openagentic"

async function simpleOpenAIExample() {
  const OPENAI_API_KEY = "your-openai-api-key"

  // 1. Create your model
  const model = new ChatOpenAI({ model: "gpt-4", apiKey: OPENAI_API_KEY })

  // 2. Wrap it with tools (automatically handles execution)
  const ai = createAIWithTools(model, allTools)

  // 3. Chat with automatic tool execution
  const result = await ai.chat("Use the OpenAI model to explain quantum physics")

  console.log("Response:", result.response)
  console.log("Tools used:", result.toolCalls?.map(t => t.toolCall?.name))
  console.log("Tool calls:", result.toolCalls)
}

simpleOpenAIExample().catch(console.error)
