export class RoomManager {
  constructor(private io: any) {}

  conversationRoom(conversationId: string) {
    return `conversation:${conversationId}`
  }

  companyRoom(companyId: string) {
    return `company:${companyId}`
  }

  agentRoom(agentId: string) {
    return `agent:${agentId}`
  }

  userRoom(userId: string) {
    return `user:${userId}`
  }

  async joinConversation(ioId: string, conversationId: string) {
    const room = this.conversationRoom(conversationId)
    await this.io.sockets.sockets.get(ioId)?.join(room)
  }

  async leaveConversation(ioId: string, conversationId: string) {
    const room = this.conversationRoom(conversationId)
    await this.io.sockets.sockets.get(ioId)?.leave(room)
  }
}
