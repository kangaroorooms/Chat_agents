import type { EmbeddingProvider } from '../knowledge.types'
import { getKnowledgeConfig } from '../knowledge.config'
import { MockEmbeddingProvider } from './mock.embedding'
import OpenAI from 'openai'

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private openai: OpenAI
  private model: string
  private dimensions: number

  constructor() {
    const config = getKnowledgeConfig()
    this.model = config.embeddingModel
    this.dimensions = config.embeddingDimensions

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: this.model,
      input: text,
    })

    const embedding = response.data[0]?.embedding
    if (!embedding) {
      throw new Error('Failed to generate embedding')
    }

    return embedding as number[]
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []

    const response = await this.openai.embeddings.create({
      model: this.model,
      input: texts,
    })

    // Sort by index to maintain order
    return response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding as number[])
  }

  getDimensions(): number {
    return this.dimensions
  }

  getModelName(): string {
    return this.model
  }
}

export function createEmbeddingProvider(
  provider: string
): EmbeddingProvider {
  switch (provider.toLowerCase()) {
    case 'openai':
      return new OpenAIEmbeddingProvider()
    case 'mock':
      return new MockEmbeddingProvider()
    default:
      throw new Error(`Unknown embedding provider: ${provider}`)
  }
}
