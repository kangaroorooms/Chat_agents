/**
 * Knowledge Base and RAG Types
 */

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
  getDimensions(): number
  getModelName(): string
}

export interface RetrievalQuery {
  query: string
  conversationId?: string
  topK?: number
  threshold?: number
  companyId?: string
}

export interface RetrievedDocument {
  documentId: string
  chunkId: string
  chunkSequence: number
  content: string
  score: number
  metadata?: Record<string, unknown>
}

export interface RetrieverService {
  retrieve(query: RetrievalQuery): Promise<RetrievedDocument[]>
  indexDocument(documentId: string): Promise<void>
  deleteDocument(documentId: string, companyId?: string): Promise<void>
}

export interface PromptContext {
  conversation: Array<{ role: string; content: string }>
  retrievedDocuments: RetrievedDocument[]
  customerContext?: {
    customerId?: string
    agentId?: string
    [key: string]: unknown
  }
  toolResults?: Array<{ toolName: string; result: unknown }>
}

export interface PromptBuilder {
  buildSystemPrompt(context: PromptContext): string
  buildUserPromptWithContext(message: string, context: PromptContext): string
  formatRetrievedDocuments(docs: RetrievedDocument[]): string
}

export interface IndexingConfig {
  chunkSize: number
  chunkOverlap: number
  embeddingProvider: string
  batchSize: number
}

export interface KnowledgeChunkData {
  sequence: number
  content: string
  embedding?: number[]
  embeddingModel?: string
  metadata?: Record<string, unknown>
}

export type DocumentSourceType = 'DOCUMENT' | 'FAQ' | 'ARTICLE' | 'MANUAL'
export type KnowledgeDocumentStatus = 'ACTIVE' | 'ARCHIVED' | 'DRAFT'

export interface KnowledgeDocumentInput {
  companyId: string
  title: string
  content: string
  metadata?: Record<string, unknown>
  tags?: string[]
  sourceType?: DocumentSourceType
  status?: KnowledgeDocumentStatus
  createdBy?: string
  updatedBy?: string
}

export interface IndexingResult {
  documentId: string
  chunksCreated: number
  tokensProcessed: number
  embeddingsGenerated: number
}

/**
 * Cosine similarity calculation for vector comparison
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vector dimensions must match')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 0

  return dotProduct / denominator
}
