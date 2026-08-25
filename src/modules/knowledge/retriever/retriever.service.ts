import { prisma } from '../../../config/prisma'
import type { RetrievalQuery, RetrievedDocument, RetrieverService, EmbeddingProvider } from '../knowledge.types'
import { cosineSimilarity } from '../knowledge.types'
import { getKnowledgeConfig } from '../knowledge.config'
import { createEmbeddingProvider } from '../embeddings/openai.embedding'

export class RetrieverServiceImpl implements RetrieverService {
  private embeddingProvider: EmbeddingProvider
  private config = getKnowledgeConfig()

  constructor() {
    this.embeddingProvider = createEmbeddingProvider(this.config.embeddingProvider)
  }

  async retrieve(query: RetrievalQuery): Promise<RetrievedDocument[]> {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.embeddingProvider.embed(query.query)

      // Get company context
      const companyId = query.companyId
      if (!companyId) {
        return []
      }

      // Fetch all chunks for company
      const chunks = await prisma.knowledgeChunk.findMany({
        where: {
          document: {
            companyId,
          },
        },
        include: {
          document: {
            select: {
              id: true,
              title: true,
              metadata: true,
            },
          },
        },
      })

      if (chunks.length === 0) {
        return []
      }

      // Calculate similarity scores
      const scoredChunks = chunks
        .filter((chunk) => chunk.embedding) // Only chunks with embeddings
        .map((chunk: any) => {
          const chunkEmbedding = JSON.parse(chunk.embedding!) as number[]
          const score = cosineSimilarity(queryEmbedding, chunkEmbedding)

          return {
            chunk,
            score,
          }
        })
        .filter(({ score }: any) => score >= (query.threshold || this.config.retrievalSimilarityThreshold))
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, query.topK || this.config.retrievalTopK)

      return scoredChunks.map(({ chunk, score }: any) => ({
        documentId: chunk.documentId,
        chunkId: chunk.id,
        chunkSequence: chunk.sequence,
        content: chunk.content,
        score,
        metadata: chunk.metadata as Record<string, unknown> | undefined,
      }))
    } catch (error) {
      console.error('Error retrieving documents:', error)
      return []
    }
  }

  async indexDocument(documentId: string): Promise<void> {
    try {
      const document = await prisma.knowledgeDocument.findUnique({
        where: { id: documentId },
        include: {
          chunks: true,
        },
      })

      if (!document) {
        throw new Error(`Document not found: ${documentId}`)
      }

      // Get all chunks for this document
      const chunks = document.chunks

      if (chunks.length === 0) {
        console.warn(`No chunks found for document: ${documentId}`)
        return
      }

      // Extract text from chunks
      const chunkTexts = chunks.map((c) => c.content)

      // Generate embeddings in batch
      const embeddings = await this.embeddingProvider.embedBatch(chunkTexts)

      // Update chunks with embeddings
      for (let i = 0; i < chunks.length; i++) {
        await prisma.knowledgeChunk.update({
          where: { id: chunks[i]!.id },
          data: {
            embedding: JSON.stringify(embeddings[i]),
            embeddingModel: this.config.embeddingModel,
          },
        })
      }

      console.log(
        `Indexed ${chunks.length} chunks for document ${documentId}`
      )
    } catch (error) {
      console.error(`Error indexing document ${documentId}:`, error)
      throw error
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      await prisma.knowledgeDocument.delete({
        where: { id: documentId },
      })
      console.log(`Deleted document: ${documentId}`)
    } catch (error) {
      console.error(`Error deleting document ${documentId}:`, error)
      throw error
    }
  }
}

let retrieverInstance: RetrieverServiceImpl | null = null

export function getRetrieverService(): RetrieverServiceImpl {
  if (!retrieverInstance) {
    retrieverInstance = new RetrieverServiceImpl()
  }
  return retrieverInstance
}
