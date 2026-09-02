import { prisma } from '../../../config/prisma'
import { getProviderForCompany } from '../../ai/provider/factory'

type TrainingStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED'

interface ChunkOptions {
  chunkSize?: number
  overlap?: number
}

export class KnowledgeTrainingService {
  /**
   * Split document content into chunks
   */
  private splitIntoChunks(content: string, options: ChunkOptions = {}): string[] {
    const chunkSize = options.chunkSize || 1000
    const overlap = options.overlap || 200
    const chunks: string[] = []

    let currentPos = 0
    while (currentPos < content.length) {
      const end = Math.min(currentPos + chunkSize, content.length)
      chunks.push(content.substring(currentPos, end))
      currentPos = end - overlap
    }

    return chunks
  }

  /**
   * Process a document for training
   * 1. Split into chunks
   * 2. Generate embeddings
   * 3. Store chunks and vectors
   * 4. Update training status
   */
  async trainDocument(documentId: string, companyId: string): Promise<void> {
    try {
      // Find the document
      const doc = await (prisma as any).knowledgeDocument.findFirst({
        where: { id: documentId, companyId },
      })

      if (!doc) {
        throw new Error(`Document not found: ${documentId}`)
      }

      // Update training status to PROCESSING
      await (prisma as any).knowledgeTraining.updateMany({
        where: { documentId },
        data: { status: 'PROCESSING' },
      })

      // Split content into chunks
      const chunks = this.splitIntoChunks(doc.content)

      // Get provider and generate embeddings
      const provider = await getProviderForCompany(companyId)

      // Create or update knowledge chunks with embeddings
      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i]
        const embedding = await provider.generateEmbedding(chunkContent)

        await (prisma as any).knowledgeChunk.upsert({
          where: {
            documentId_sequence: {
              documentId,
              sequence: i,
            },
          },
          create: {
            documentId,
            sequence: i,
            content: chunkContent,
            embedding: JSON.stringify(embedding),
            embeddingModel: 'text-embedding-3-small',
          },
          update: {
            content: chunkContent,
            embedding: JSON.stringify(embedding),
            embeddingModel: 'text-embedding-3-small',
          },
        })
      }

      // Update document status
      await (prisma as any).knowledgeDocument.update({
        where: { id: documentId },
        data: { status: 'ACTIVE' },
      })

      // Update training status to READY
      await (prisma as any).knowledgeTraining.updateMany({
        where: { documentId },
        data: { status: 'READY', error: null },
      })
    } catch (error) {
      console.error('Training document error:', error)

      // Update training status to FAILED
      await (prisma as any).knowledgeTraining.updateMany({
        where: { documentId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })

      throw error
    }
  }

  /**
   * Get training status for a document
   */
  async getTrainingStatus(documentId: string): Promise<{ status: TrainingStatus; error?: string }> {
    const training = await (prisma as any).knowledgeTraining.findFirst({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    })

    return training
      ? { status: training.status, error: training.error || undefined }
      : { status: 'PENDING' }
  }

  /**
   * List documents ready for use
   */
  async listReadyDocuments(companyId: string): Promise<any[]> {
    return (prisma as any).knowledgeDocument.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
      },
      include: {
        chunks: {
          select: {
            id: true,
            sequence: true,
            embedding: true,
          },
        },
      },
    })
  }
}

export const knowledgeTrainingService = new KnowledgeTrainingService()
