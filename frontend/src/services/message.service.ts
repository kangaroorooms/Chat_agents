import api from '../api/axios'
import type { Message } from '../types/message'

interface CreateMessagePayload {
  conversationId: string;
  content: string;
}

class MessageService {
  async createMessage(data: CreateMessagePayload): Promise<Message> {
    const response = await api.post('/messages', data)
    return response.data?.data ?? response.data
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    const response = await api.get(`/messages/conversations/${conversationId}`)
    return response.data?.data ?? response.data
  }

  async editMessage(messageId: string, data: { content: string }): Promise<Message> {
    const response = await api.patch(`/messages/${messageId}`, data)
    return response.data?.data ?? response.data
  }

  async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/messages/${messageId}`)
    return response.data?.data ?? response.data
  }
}

export default new MessageService()