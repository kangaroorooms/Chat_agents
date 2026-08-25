import api from '../api/axios'
import type { Conversation } from '../types/conversation'

class ConversationService {
  async createConversation(participantId: string): Promise<Conversation> {
    const response = await api.post('/conversations', {
      participantId,
    })

    // API wraps response in { success, message, data }
    return response.data?.data ?? response.data
  }

  async listConversations(opts?: { limit?: number; cursor?: string; search?: string; state?: string }) {
    const { limit, cursor, search, state } = opts ?? {}
    const params: Record<string, unknown> = {}
    if (limit) params['limit'] = limit
    if (cursor) params['cursor'] = cursor
    if (search) params['search'] = search
    if (state) params['state'] = state

    const resp = await api.get('/conversations', { params })
    const items = resp.data?.data ?? resp.data
    const pagination = resp.data?.pagination ?? null
    return { items, pagination }
  }

  async listAgentQueue(opts?: { limit?: number; cursor?: string; search?: string }) {
    const { limit, cursor, search } = opts ?? {}
    const params: Record<string, unknown> = {}
    if (limit) params['limit'] = limit
    if (cursor) params['cursor'] = cursor
    if (search) params['search'] = search

    const resp = await api.get('/conversations/queue', { params })
    const items = resp.data?.data ?? resp.data
    const pagination = resp.data?.pagination ?? null
    return { items, pagination }
  }

  async getConversation(conversationId: string) {
    const resp = await api.get(`/conversations/${conversationId}`)
    return resp.data?.data ?? resp.data
  }

  async resolveConversation(conversationId: string) {
    const resp = await api.patch(`/conversations/${conversationId}/resolve`)
    return resp.data?.data ?? resp.data
  }

  async closeConversation(conversationId: string) {
    const resp = await api.patch(`/conversations/${conversationId}/close`)
    return resp.data?.data ?? resp.data
  }

  async reopenConversation(conversationId: string) {
    const resp = await api.patch(`/conversations/${conversationId}/reopen`)
    return resp.data?.data ?? resp.data
  }

  async assignConversation(conversationId: string, ownerId: string) {
    const resp = await api.patch(`/conversations/${conversationId}/assign`, { ownerId })
    return resp.data?.data ?? resp.data
  }

  async transferConversation(conversationId: string, toAgentId: string) {
    const resp = await api.patch(`/conversations/${conversationId}/transfer`, { toAgentId })
    return resp.data?.data ?? resp.data
  }

  async escalateConversation(conversationId: string, targetAgentId?: string) {
    const resp = await api.patch(`/conversations/${conversationId}/escalate`, { targetAgentId })
    return resp.data?.data ?? resp.data
  }
}

export default new ConversationService()
