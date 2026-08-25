import type { IndexingConfig } from './knowledge.types'

export interface KnowledgeConfig {
  embeddingProvider: string
  embeddingModel: string
  embeddingDimensions: number
  retrievalTopK: number
  retrievalSimilarityThreshold: number
  chunkSize: number
  chunkOverlap: number
  batchSize: number
  autoIndex: boolean
}

export function loadKnowledgeConfig(): KnowledgeConfig {
  return {
    embeddingProvider: process.env.EMBEDDING_PROVIDER || 'openai',
    embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    embeddingDimensions: parseInt(
      process.env.EMBEDDING_DIMENSIONS || '1536',
      10
    ),
    retrievalTopK: parseInt(process.env.RETRIEVAL_TOP_K || '5', 10),
    retrievalSimilarityThreshold: parseFloat(
      process.env.RETRIEVAL_SIMILARITY_THRESHOLD || '0.5'
    ),
    chunkSize: parseInt(process.env.RETRIEVAL_CHUNK_SIZE || '512', 10),
    chunkOverlap: parseFloat(process.env.RETRIEVAL_CHUNK_OVERLAP || '0.1'),
    batchSize: parseInt(process.env.KNOWLEDGE_BATCH_SIZE || '10', 10),
    autoIndex: process.env.KNOWLEDGE_AUTO_INDEX === 'true',
  }
}

let configInstance: KnowledgeConfig | null = null

export function getKnowledgeConfig(): KnowledgeConfig {
  if (!configInstance) {
    configInstance = loadKnowledgeConfig()
  }
  return configInstance
}

export function getIndexingConfig(): IndexingConfig {
  const config = getKnowledgeConfig()
  return {
    chunkSize: config.chunkSize,
    chunkOverlap: config.chunkOverlap,
    embeddingProvider: config.embeddingProvider,
    batchSize: config.batchSize,
  }
}
