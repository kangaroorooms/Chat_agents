import type { Company, Conversation, ConversationQueueState, ConversationState } from '@prisma/client'

export type ConversationDomainEventName =
  | 'conversation.assigned'
  | 'conversation.transferred'
  | 'conversation.escalated'
  | 'conversation.resolved'
  | 'conversation.closed'
  | 'conversation.reopened'
  | 'conversation.handoffToAI'
  | 'conversation.handoffToAgent'
  | 'conversation.ai.suggested'
  | 'conversation.ai.summarized'
  | 'conversation.ai.handoffRequested'
  | 'conversation.ai.replied'

export type CompanyDomainEventName = 'company.created' | 'company.updated' | 'company.deleted'
export type DomainEventName = ConversationDomainEventName | CompanyDomainEventName

export interface ConversationDomainEventPayload {
  conversationId: string
  performedById: string
  previousState?: ConversationState
  previousQueueState?: ConversationQueueState
  previousOwnerId?: string | null
  ownerId?: string | null
  assignedById?: string | null
  queueState?: ConversationQueueState
  metadata?: Record<string, unknown> | null
  conversation: Conversation
  aiSummary?: string
  aiSuggestions?: string[]
  aiHandoffReason?: string
}

export interface CompanyDomainEventPayload {
  companyId: string
  performedById: string
  company: Company
}

export interface DomainEventPayloadMap {
  'conversation.assigned': ConversationDomainEventPayload
  'conversation.transferred': ConversationDomainEventPayload
  'conversation.escalated': ConversationDomainEventPayload
  'conversation.resolved': ConversationDomainEventPayload
  'conversation.closed': ConversationDomainEventPayload
  'conversation.reopened': ConversationDomainEventPayload
  'conversation.handoffToAI': ConversationDomainEventPayload
  'conversation.handoffToAgent': ConversationDomainEventPayload
  'conversation.ai.suggested': ConversationDomainEventPayload
  'conversation.ai.summarized': ConversationDomainEventPayload
  'conversation.ai.handoffRequested': ConversationDomainEventPayload
  'conversation.ai.replied': ConversationDomainEventPayload
  'company.created': CompanyDomainEventPayload
  'company.updated': CompanyDomainEventPayload
  'company.deleted': CompanyDomainEventPayload
}
