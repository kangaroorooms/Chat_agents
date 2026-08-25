import { prisma } from '../../config/prisma'
import { getRetrieverService } from '../knowledge/retriever/retriever.service'
import type { RetrievedDocument } from '../knowledge/knowledge.types'

export interface AISearchOptions {
  query?: string
  companyId: string
  topK?: number
  threshold?: number
  tags?: string[]
  title?: string
  onlyActive?: boolean
}

export class AIRetrievalService {
  private retriever = getRetrieverService()

  /**
   * Search knowledge base using embeddings (when query provided) and
   * additional filters (tags, title, active-only). Results are merged
   * and ranked by score.
   */
  async search(opts: AISearchOptions): Promise<RetrievedDocument[]> {
    const { companyId, query, topK = 5, threshold, tags, title, onlyActive } = opts

    // Use retriever for semantic search when query is present
    let semanticResults: RetrievedDocument[] = []
    if (query && query.trim().length > 0) {
      semanticResults = await this.retriever.retrieve({ query, companyId, topK, threshold })
    }

    // Fetch filter-based documents (title, tags, status)
    const where: any = { companyId }
    if (onlyActive) {
      where.status = 'ACTIVE'
    }
    if (title) {
      where.title = { contains: title, mode: 'insensitive' }
    }
    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags }
    }

    let filterDocs: any[] = []
    if (title || (tags && tags.length > 0) || onlyActive) {
      filterDocs = await prisma.knowledgeDocument.findMany({
        where,
        include: { chunks: true },
        take: 50,
      })
    }

    // Map filtered docs to RetrievedDocument entries (assign strong score)
    const filterResults: RetrievedDocument[] = filterDocs.flatMap((doc) =>
      (doc.chunks || []).map((chunk: any) => ({
        documentId: doc.id,
        chunkId: chunk.id,
        chunkSequence: chunk.sequence,
        content: chunk.content,
        score: 0.9, // high base score for explicit filters
        metadata: doc.metadata,
      }))
    )

    // Merge semanticResults and filterResults, dedupe by chunkId, prefer higher score
    const map = new Map<string, RetrievedDocument>()
    for (const r of [...semanticResults, ...filterResults]) {
      const existing = map.get(r.chunkId)
      if (!existing || (r.score ?? 0) > (existing.score ?? 0)) {
        map.set(r.chunkId, r)
      }
    }

    const merged = Array.from(map.values()).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    return merged.slice(0, topK)
  }
}

let aiRetrievalInstance: AIRetrievalService | null = null

export function getAIRetrievalService() {
  if (!aiRetrievalInstance) aiRetrievalInstance = new AIRetrievalService()
  return aiRetrievalInstance
}
