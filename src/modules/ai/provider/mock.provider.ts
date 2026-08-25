import type { AIProvider, GenerateTextOptions, ProviderAnswer } from './provider.types'

export class MockProvider implements AIProvider {
  async generateText(prompt: string, options?: GenerateTextOptions): Promise<{ text: string; confidence?: number }> {
    return { text: `Mock response to: ${prompt}`, confidence: 0.8 }
  }

  async generateEmbedding(input: string): Promise<number[]> {
    return new Array(1536).fill(Math.random())
  }

  async generateAnswer(companyId: string, userMessage: string, docs?: any[]): Promise<ProviderAnswer> {
    return { 
      answer: `Mock answer for: ${userMessage}`, 
      confidence: 0.6,
      sources: docs?.map((d) => ({ documentId: d.documentId, score: d.score })) || []
    }
  }
}

export const mockProvider = new MockProvider()
