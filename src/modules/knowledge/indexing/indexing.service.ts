import { prisma } from '../../../config/prisma'
import { Prisma } from '@prisma/client'
import type { KnowledgeDocumentInput, IndexingResult } from '../knowledge.types'
import { smartChunk } from './chunking'
import { getKnowledgeConfig, getIndexingConfig } from '../knowledge.config'
import { createEmbeddingProvider } from '../embeddings/openai.embedding'
import { getRetrieverService } from '../retriever/retriever.service'

export class IndexingServiceImpl {
  private config = getIndexingConfig()
  private knowledgeConfig = getKnowledgeConfig()
  private embeddingProvider = createEmbeddingProvider(this.config.embeddingProvider)

  async indexDocument(input: KnowledgeDocumentInput): Promise<IndexingResult> {
    try {
      // Create a training record to track ingestion status
      let training: any = null
      try {
        training = await (prisma as any).knowledgeTraining.create({ data: { documentId: 'pending', status: 'PENDING' } })
      } catch (err) {
        // ignore if migration not applied yet
        training = null
      }
      // Create document
      const document = await prisma.knowledgeDocument.create({
        data: {
          companyId: input.companyId,
          title: input.title,
          content: input.content,
          metadata: input.metadata ? input.metadata as Prisma.InputJsonValue : Prisma.JsonNull,
          tags: input.tags ?? undefined,
          sourceType: input.sourceType ?? 'DOCUMENT',
          status: input.status ?? 'ACTIVE',
          createdBy: input.createdBy ?? null,
          updatedBy: input.updatedBy ?? null,
        },
      })

      // If we created a placeholder training record, update it to link to the real document and mark processing
      if (training) {
        try {
          await (prisma as any).knowledgeTraining.update({ where: { id: training.id }, data: { documentId: document.id, status: 'PROCESSING' } })
        } catch (err) {
          // ignore
        }
      }

      // Chunk the document
      const { chunks, tokenCount } = smartChunk(
        input.content,
        this.config.chunkSize,
        this.config.chunkOverlap
      )

      // Create chunk records
      const createdChunks = await Promise.all(
        chunks.map((content, sequence) =>
          prisma.knowledgeChunk.create({
            data: {
              documentId: document.id,
              sequence,
              content,
            },
          })
        )
      )

      // Generate embeddings in batches
      let embeddingsGenerated = 0
      for (let i = 0; i < chunks.length; i += this.config.batchSize) {
        const batchChunks = chunks.slice(
          i,
          i + this.config.batchSize
        )
        const embeddings = await this.embeddingProvider.embedBatch(batchChunks)

        // Update chunks with embeddings
        for (let j = 0; j < embeddings.length; j++) {
          await prisma.knowledgeChunk.update({
            where: { id: createdChunks[i + j]!.id },
            data: {
              embedding: JSON.stringify(embeddings[j]),
              embeddingModel: this.knowledgeConfig.embeddingModel,
            },
          })
          embeddingsGenerated++
        }
      }

      // Mark training ready
      if (training) {
        try {
          await (prisma as any).knowledgeTraining.update({ where: { id: training.id }, data: { status: 'READY' } })
        } catch (err) {
          // ignore
        }
      }

      return {
        documentId: document.id,
        chunksCreated: createdChunks.length,
        tokensProcessed: tokenCount,
        embeddingsGenerated,
      }
    } catch (error) {
      console.error('Error indexing document:', error)
      // update training record to FAILED if possible
      try {
        if ((error as any).trainingId) await (prisma as any).knowledgeTraining.update({ where: { id: (error as any).trainingId }, data: { status: 'FAILED', error: String(error) } })
      } catch (e) {
        // ignore
      }
      throw error
    }
  }

  async reindexDocument(documentId: string, companyId?: string): Promise<IndexingResult> {
    try {
      const document = await prisma.knowledgeDocument.findFirst({
        where: { id: documentId, ...(companyId ? { companyId } : {}) },
      })

      if (!document) {
        throw new Error(`Document not found: ${documentId}`)
      }

      // Delete existing chunks
      await prisma.knowledgeChunk.deleteMany({
        where: { documentId },
      })

      // Re-index as new document
      return this.indexDocument({
        companyId: document.companyId,
        title: document.title,
        content: document.content,
        metadata: document.metadata as Record<string, unknown> | undefined,
      })
    } catch (error) {
      console.error(`Error reindexing document ${documentId}:`, error)
      throw error
    }
  }

  async batchIndexDocuments(documentIds: string[]): Promise<IndexingResult[]> {
    const results: IndexingResult[] = []

    for (const documentId of documentIds) {
      try {
        const result = await this.reindexDocument(documentId)
        results.push(result)
      } catch (error) {
        console.error(`Failed to index document ${documentId}:`, error)
      }
    }

    return results
  }
}

let indexingInstance: IndexingServiceImpl | null = null

export function getIndexingService(): IndexingServiceImpl {
  if (!indexingInstance) {
    indexingInstance = new IndexingServiceImpl()
  }
  return indexingInstance
}
