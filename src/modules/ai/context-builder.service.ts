import { buildConversationContext } from './ai.memory'
import { getAIRetrievalService } from './retrieval.service'
import type { ConversationContext } from './ai.types'

export interface ContextBuildOptions {
  companyId?: string
  topK?: number
}

export async function buildConversationContextWithRetrieval(conversationId: string, opts: ContextBuildOptions = {}): Promise<ConversationContext & { retrievedDocuments: any[] }> {
  const base = await buildConversationContext(conversationId)

  // Attempt to use conversation metadata/companyId or provided companyId
  const companyId = opts.companyId || (base.metadata && (base.metadata as any).companyId) || undefined

  let retrievedDocuments: any[] = []
  if (companyId) {
    const retriever = getAIRetrievalService()
    // Use last user message as query if available
    const lastMessage = base.messages[base.messages.length - 1]
    const query = lastMessage ? lastMessage.content : ''
    if (query) {
      retrievedDocuments = await retriever.search({ query, companyId, topK: opts.topK || 5 })
    }
  }

  return {
    ...base,
    retrievedDocuments,
  }
}
