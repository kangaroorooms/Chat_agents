import OpenAI from 'openai'
import type { AIProvider, GenerateTextOptions, ProviderAnswer } from './provider.types'

export class OpenAIProvider implements AIProvider {
  private client: any

  constructor(apiKey?: string) {
    if (apiKey) {
      this.client = new OpenAI({ apiKey })
    } else {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    }
  }

  async generateText(prompt: string, options?: GenerateTextOptions): Promise<{ text: string; confidence?: number }> {
    try {
      const resp = await this.client.chat.completions.create({
        model: options?.model || process.env.AI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.maxTokens || parseInt(process.env.AI_MAX_TOKENS || '1024', 10),
        temperature: options?.temperature ?? parseFloat(process.env.AI_TEMPERATURE || '0.7'),
      })
      const text = resp.choices[0]?.message?.content || ''
      return { text, confidence: 0.9 }
    } catch (err) {
      console.error('OpenAI generateText error', err)
      return { text: '', confidence: 0 }
    }
  }

  async generateEmbedding(input: string): Promise<number[]> {
    try {
      const resp = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input,
      })
      return resp.data[0]?.embedding || []
    } catch (err) {
      console.error('OpenAI generateEmbedding error', err)
      return []
    }
  }

  async generateAnswer(companyId: string, userMessage: string, docs?: any[]): Promise<ProviderAnswer> {
    try {
      const contextPrompt = docs && docs.length > 0 
        ? `Context from knowledge base:\n${docs.map((d) => d.content).join('\n\n')}\n\nUser message: ${userMessage}`
        : userMessage

      const resp = await this.client.chat.completions.create({
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful support assistant. Provide accurate, helpful answers.' },
          { role: 'user', content: contextPrompt },
        ],
        max_tokens: parseInt(process.env.AI_MAX_TOKENS || '1024', 10),
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
      })
      const answer = resp.choices[0]?.message?.content || ''
      return { 
        answer, 
        confidence: 0.85,
        sources: docs?.map((d) => ({ documentId: d.documentId, score: d.score })) || []
      }
    } catch (err) {
      console.error('OpenAI generateAnswer error', err)
      return { answer: '', confidence: 0, sources: [] }
    }
  }
}
