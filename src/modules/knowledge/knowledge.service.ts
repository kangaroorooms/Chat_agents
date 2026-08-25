import type { KnowledgeDocumentInput, RetrievalQuery, RetrievedDocument } from './knowledge.types'
import { getRetrieverService } from './retriever/retriever.service'
import { getIndexingService } from './indexing/indexing.service'
import { getPromptBuilder } from './prompt/prompt-builder'

/**
 * Knowledge Service - Main API for knowledge base operations
 */
export class KnowledgeServiceImpl {
  private retriever = getRetrieverService()
  private indexing = getIndexingService()
  private promptBuilder = getPromptBuilder()

  /**
   * Add a new document to the knowledge base
   */
  async addDocument(input: KnowledgeDocumentInput) {
    return this.indexing.indexDocument(input)
  }

  /**
   * Retrieve relevant documents for a query
   */
  async retrieveDocuments(query: RetrievalQuery): Promise<RetrievedDocument[]> {
    return this.retriever.retrieve(query)
  }

  /**
   * Delete a document from the knowledge base
   */
  async deleteDocument(documentId: string) {
    return this.retriever.deleteDocument(documentId)
  }

  /**
   * Reindex a document
   */
  async reindexDocument(documentId: string) {
    return this.indexing.reindexDocument(documentId)
  }

  /**
   * Batch reindex documents
   */
  async batchReindexDocuments(documentIds: string[]) {
    return this.indexing.batchIndexDocuments(documentIds)
  }

  /**
   * Get prompt builder instance
   */
  getPromptBuilder() {
    return this.promptBuilder
  }
}

let knowledgeServiceInstance: KnowledgeServiceImpl | null = null

export function getKnowledgeService(): KnowledgeServiceImpl {
  if (!knowledgeServiceInstance) {
    knowledgeServiceInstance = new KnowledgeServiceImpl()
  }
  return knowledgeServiceInstance
}
