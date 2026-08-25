import type { EmbeddingProvider } from '../knowledge.types'

/**
 * Mock embedding provider for testing and development
 * Generates deterministic embeddings based on text hash
 */
export class MockEmbeddingProvider implements EmbeddingProvider {
  private dimensions: number = 1536

  async embed(text: string): Promise<number[]> {
    return this.generateDeterministicEmbedding(text)
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.generateDeterministicEmbedding(text))
  }

  getDimensions(): number {
    return this.dimensions
  }

  getModelName(): string {
    return 'mock-embedding-model'
  }

  /**
   * Generate deterministic embedding from text
   * Uses simple hash to seed random number generation
   */
  private generateDeterministicEmbedding(text: string): number[] {
    const seed = this.hashString(text)
    const embedding: number[] = []

    for (let i = 0; i < this.dimensions; i++) {
      // Seeded pseudo-random number generator
      const x = Math.sin(seed + i) * 10000
      const value = x - Math.floor(x)
      embedding.push(value * 2 - 1) // Range [-1, 1]
    }

    // Normalize to approximate unit vector
    const norm = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    )
    return embedding.map((val) => val / norm)
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }
}
