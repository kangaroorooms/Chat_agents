import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider, GenerateTextOptions, ProviderAnswer } from './provider.types'

export class AnthropicProvider implements AIProvider {
  private client: any
  private apiKey?: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY
    if (this.apiKey) {
      this.client = new Anthropic({ apiKey: this.apiKey })
    }
  }

  async generateText(prompt: string, options?: GenerateTextOptions): Promise<{ text: string; confidence?: number }> {
    if (!this.apiKey) {
      return { text: '', confidence: 0 }
    }
    try {
      const resp = await this.client.messages.create({
        model: options?.model || 'claude-3-5-sonnet-20241022',
        max_tokens: options?.maxTokens || 1024,
        temperature: options?.temperature ?? 0.7,
        messages: [{ role: 'user', content: prompt }],
      })
      const text = resp.content[0]?.type === 'text' ? resp.content[0].text : ''
      return { text, confidence: 0.9 }
    } catch (err) {
      console.error('Anthropic generateText error', err)
      return { text: '', confidence: 0 }
    }
  }

  async generateEmbedding(input: string): Promise<number[]> {
    // Anthropic doesn't have native embedding support, fall back to mock
    console.warn('Anthropic provider does not support embeddings natively')
    return new Array(1536).fill(0)
  }

  async generateAnswer(companyId: string, userMessage: string, docs?: any[]): Promise<ProviderAnswer> {
    if (!this.apiKey) {
      return { answer: '', confidence: 0, sources: [] }
    }
    try {
      const contextPrompt = docs && docs.length > 0 
        ? `Context from knowledge base:\n${docs.map((d) => d.content).join('\n\n')}\n\nUser message: ${userMessage}`
        : userMessage

      const resp = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        temperature: 0.7,
        system: 'You are a helpful support assistant. Provide accurate, helpful answers based on the context provided.',
        messages: [{ role: 'user', content: contextPrompt }],
      })
      const answer = resp.content[0]?.type === 'text' ? resp.content[0].text : ''
      return { 
        answer, 
        confidence: 0.88,
        sources: docs?.map((d) => ({ documentId: d.documentId, score: d.score })) || []
      }
    } catch (err) {
      console.error('Anthropic generateAnswer error', err)
      return { answer: '', confidence: 0, sources: [] }
    }
  }
}

export default AnthropicProvider
