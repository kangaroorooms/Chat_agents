export interface MessageSender {
  id: string
  username: string
  email: string
}

export interface Message {
  id: string
  content: string
  senderId: string
  sender?: MessageSender
  conversationId: string
  replyToId?: string | null
  editedAt?: string | null
  createdAt: string
}