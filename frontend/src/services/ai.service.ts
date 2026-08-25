import api from '../api/axios'
import conversationService from './conversation.service'
import messageService from './message.service'
import type { AISource } from '../types/ai'

class AIService {
  async getSuggestion(conversationId: string): Promise<{ suggestion: string; confidence: number; sources: AISource[] }> {
    // Try to obtain last user message
    let lastMessage = ''
    try {
      const msgs = await messageService.getMessages(conversationId)
      if (Array.isArray(msgs) && msgs.length > 0) {
        lastMessage = msgs[msgs.length - 1].content ?? ''
      }
    } catch {
      // ignore, backend suggest endpoint will derive last message
    }

    // Call suggestions endpoint (backend will derive last message if not provided)
    const body: Record<string, unknown> = {}
    if (lastMessage) body['message'] = lastMessage
    const resp = await api.post(`/ai/conversations/${conversationId}/suggest`, body)
    const respBody = (resp.data ?? (resp.data && resp.data.data)) as unknown
    const bodyObj = (respBody && typeof respBody === 'object') ? (respBody as Record<string, unknown>) : {}
    const suggestionText = Array.isArray(bodyObj['suggestions']) && (bodyObj['suggestions'] as unknown[]).length > 0 ? String((bodyObj['suggestions'] as unknown[])[0]) : ''
    const confidence = typeof bodyObj['confidence'] === 'number' ? (bodyObj['confidence'] as number) : 0

    // Fetch KB sources for the same query to provide document titles
    const sources: AISource[] = []
    try {
      const conv = await conversationService.getConversation(conversationId)
      const companyId = conv?.metadata && typeof conv.metadata === 'object' ? (conv.metadata as Record<string, unknown>)['companyId'] as string | undefined : undefined
      const searchBody: Record<string, unknown> = { query: lastMessage || '', topK: 5 }
      if (companyId) searchBody['companyId'] = companyId
      const kb = await api.post('/knowledge/search', searchBody)
      const results = kb.data?.data ?? kb.data
      if (Array.isArray(results)) {
        // Map to unique documentId/title pairs
        const map = new Map<string, AISource>()
        for (const r of results) {
          if (r && typeof r === 'object' && 'documentId' in r && r.documentId && r.metadata && typeof r.metadata === 'object') {
            const meta = r.metadata as Record<string, unknown>
            const title = meta['title'] ? String(meta['title']) : ''
            const rObj = r as Record<string, unknown>
            const docId = rObj['documentId'] ? String(rObj['documentId']) : ''
            if (docId) map.set(docId, { documentId: docId, title })
          }
        }
        for (const v of map.values()) sources.push(v)
      }
    } catch {
      // non-fatal: no sources available
    }

    return { suggestion: suggestionText, confidence, sources }
  }
}

export default new AIService()
