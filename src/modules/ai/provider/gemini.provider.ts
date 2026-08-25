import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIProvider, GenerateTextOptions, ProviderAnswer } from './provider.types'

export class GeminiProvider implements AIProvider {
  private client: any
  private apiKey?: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_API_KEY
    if (this.apiKey) {
      this.client = new GoogleGenerativeAI(this.apiKey)
    }
  }

  async generateText(prompt: string, options?: GenerateTextOptions): Promise<{ text: string; confidence?: number }> {
    if (!this.apiKey) {
      return { text: '', confidence: 0 }
    }
    try {
      const model = this.client.getGenerativeModel({ model: options?.model || 'gemini-1.5-pro' })
      const resp = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens || 1024,
        },
      })
      const text = resp.response.text()
      return { text, confidence: 0.9 }
    } catch (err) {
      console.error('Gemini generateText error', err)
      return { text: '', confidence: 0 }
    }
  }

  async generateEmbedding(input: string): Promise<number[]> {
    if (!this.apiKey) {
      return []
    }
    try {
      const model = this.client.getGenerativeModel({ model: 'embedding-001' })
      const resp = await model.embedContent(input)
      return resp.embedding.values || []
    } catch (err) {
      console.error('Gemini generateEmbedding error', err)
      return []
    }
  }

  async generateAnswer(companyId: string, userMessage: string, docs?: any[]): Promise<ProviderAnswer> {
    if (!this.apiKey) {
      return { answer: '', confidence: 0, sources: [] }
    }
    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-1.5-pro' })
      const contextPrompt = docs && docs.length > 0 
        ? `Context from knowledge base:\n${docs.map((d) => d.content).join('\n\n')}\n\nUser message: ${userMessage}`
        : userMessage

      const resp = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: `You are a helpful support assistant. Provide accurate, helpful answers based on the context provided.\n\n${contextPrompt}` }
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      })
      const answer = resp.response.text()
      return { 
        answer, 
        confidence: 0.87,
        sources: docs?.map((d) => ({ documentId: d.documentId, score: d.score })) || []
      }
    } catch (err) {
      console.error('Gemini generateAnswer error', err)
      return { answer: '', confidence: 0, sources: [] }
    }
  }
}

export default GeminiProvider
