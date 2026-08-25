import type { Message } from './message'

export interface ConversationParticipant {
  user: {
    id: string
    username: string
    email: string
    role?: string
  }
}

export interface ConversationOwner {
  id: string
  username: string
  email: string
}

export interface Conversation {
  id: string
  title?: string | null
  state?: 'OPEN' | 'PENDING' | 'CLOSED' | 'ARCHIVED'
  queueState?: 'NEW' | 'ASSIGNED' | 'TRANSFERRED' | 'ESCALATED' | 'ON_HOLD'
  owner?: ConversationOwner | null
  assignedBy?: ConversationOwner | null
  assignedAt?: string | null
  lastMessageAt?: string | null
  metadata?: Record<string, unknown> | null
  participants?: ConversationParticipant[]
  participantIds?: string[]
  createdAt: string
  messages?: Message[]
}
