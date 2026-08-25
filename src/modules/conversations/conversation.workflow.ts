import { prisma } from '../../config/prisma'
import { domainEventBus } from '../events/domain-event-bus'
import type { Conversation, ConversationQueueState, ConversationState, Prisma, UserRole } from '@prisma/client'
import type { DomainEventName } from '../events/domain-events'

export interface ConversationWorkflowEventPayload {
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

export type ConversationWorkflowEventName = DomainEventName

const AGENT_ROLES: UserRole[] = ['AGENT', 'ADMIN', 'SUPER_ADMIN']
const AI_SYSTEM_USER_ID = 'AI_SYSTEM'

export class ConversationWorkflowService {
  events = domainEventBus

  private async loadConversation(conversationId: string) {
    return prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { select: { userId: true } } },
    })
  }

  private async loadUser(userId: string) {
    return prisma.user.findUnique({ where: { id: userId } })
  }

  private isAgentRole(role?: UserRole) {
    return role ? AGENT_ROLES.includes(role) : false
  }

  private isSystemCaller(userId: string) {
    return userId === AI_SYSTEM_USER_ID
  }

  private ensureCallerIsParticipantOrAdmin(
    callerRole: UserRole | undefined,
    userId: string,
    participantIds: string[]
  ) {
    if (this.isSystemCaller(userId)) return
    if (callerRole === 'ADMIN' || callerRole === 'SUPER_ADMIN') return
    if (!participantIds.includes(userId)) {
      throw new Error('Forbidden')
    }
  }

  private ensureCallerCanManageOwnership(
    callerRole: UserRole | undefined,
    userId: string,
    conversationOwnerId: string | null
  ) {
    if (this.isSystemCaller(userId)) return
    if (callerRole === 'ADMIN' || callerRole === 'SUPER_ADMIN') return
    if (conversationOwnerId !== userId) {
      throw new Error('Forbidden')
    }
  }

  private emitEvent(event: ConversationWorkflowEventName, payload: ConversationWorkflowEventPayload) {
    domainEventBus.emit(event, payload)
  }

  private normalizeMetadata(metadata: Conversation['metadata']) {
    return (metadata && typeof metadata === 'object') ? { ...metadata as Record<string, unknown> } : {}
  }

  private metadataCreateInput(metadata: Record<string, unknown>) {
    return metadata as Prisma.JsonObject
  }

  async assign(userId: string, conversationId: string, ownerId: string) {
    const [conversation, caller, target] = await Promise.all([
      this.loadConversation(conversationId),
      this.loadUser(userId),
      this.loadUser(ownerId),
    ])

    if (!conversation) throw new Error('Conversation not found')
    if (!caller) throw new Error('Caller not found')
    if (!target) throw new Error('Target agent not found')
    if (!this.isAgentRole(target.role)) throw new Error('Target user is not an agent')

    this.ensureCallerIsParticipantOrAdmin(caller.role, userId, conversation.participants.map((p) => p.userId))
    if (!this.isAgentRole(caller.role)) throw new Error('Only agents or admins may assign conversations')
    if (conversation.state === 'CLOSED' || conversation.state === 'ARCHIVED') {
      throw new Error('Cannot assign a closed or archived conversation')
    }
    if (conversation.ownerId && conversation.ownerId !== userId && caller.role !== 'ADMIN' && caller.role !== 'SUPER_ADMIN') {
      throw new Error('Only the current owner or admin may reassign this conversation')
    }

    const previousOwnerId = conversation.ownerId
    const isTransfer = !!previousOwnerId && previousOwnerId !== ownerId
    const queueState: ConversationQueueState = isTransfer ? 'TRANSFERRED' : 'ASSIGNED'
    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ownerId,
        queueState,
        assignedAt: new Date(),
        assignedById: userId,
      },
    })

    this.emitEvent('conversation.assigned', {
      conversationId,
      performedById: userId,
      previousOwnerId,
      ownerId,
      assignedById: userId,
      queueState,
      conversation: updated,
    })

    return updated
  }

  async transfer(userId: string, conversationId: string, toAgentId: string) {
    const conversation = await this.loadConversation(conversationId)
    const caller = await this.loadUser(userId)

    if (!conversation) throw new Error('Conversation not found')
    if (!caller) throw new Error('Caller not found')
    if (!conversation.ownerId) throw new Error('Conversation has no owner to transfer')

    this.ensureCallerIsParticipantOrAdmin(caller.role, userId, conversation.participants.map((p) => p.userId))
    this.ensureCallerCanManageOwnership(caller.role, userId, conversation.ownerId)

    const updated = await this.assign(userId, conversationId, toAgentId)

    this.emitEvent('conversation.transferred', {
      conversationId,
      performedById: userId,
      previousOwnerId: conversation.ownerId,
      ownerId: updated.ownerId,
      assignedById: userId,
      queueState: updated.queueState,
      conversation: updated,
    })

    return updated
  }

  async escalate(userId: string, conversationId: string, targetAgentId?: string) {
    const [conversation, caller] = await Promise.all([
      this.loadConversation(conversationId),
      this.loadUser(userId),
    ])

    if (!conversation) throw new Error('Conversation not found')
    if (!caller) throw new Error('Caller not found')
    if (conversation.state === 'CLOSED' || conversation.state === 'ARCHIVED') {
      throw new Error('Cannot escalate a closed or archived conversation')
    }

    this.ensureCallerIsParticipantOrAdmin(caller.role, userId, conversation.participants.map((p) => p.userId))
    this.ensureCallerCanManageOwnership(caller.role, userId, conversation.ownerId)

    let data: any = { queueState: 'ESCALATED' as ConversationQueueState }
    let assignedById = conversation.assignedById
    let ownerId = conversation.ownerId

    if (targetAgentId) {
      const target = await this.loadUser(targetAgentId)
      if (!target) throw new Error('Target agent not found')
      if (!this.isAgentRole(target.role)) throw new Error('Target user is not an agent')
      data.ownerId = targetAgentId
      data.assignedAt = new Date()
      assignedById = userId
      ownerId = targetAgentId
    }

    if (!assignedById) {
      assignedById = userId
    }

    data.assignedById = assignedById

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data,
    })

    this.emitEvent('conversation.escalated', {
      conversationId,
      performedById: userId,
      previousQueueState: conversation.queueState,
      previousOwnerId: conversation.ownerId,
      ownerId,
      assignedById,
      queueState: 'ESCALATED',
      conversation: updated,
    })

    return updated
  }

  async resolve(userId: string, conversationId: string) {
    const [conversation, caller] = await Promise.all([
      this.loadConversation(conversationId),
      this.loadUser(userId),
    ])

    if (!conversation) throw new Error('Conversation not found')
    if (!caller) throw new Error('Caller not found')
    if (conversation.state === 'CLOSED' || conversation.state === 'ARCHIVED') {
      throw new Error('Cannot resolve a closed or archived conversation')
    }

    this.ensureCallerIsParticipantOrAdmin(caller.role, userId, conversation.participants.map((p) => p.userId))
    this.ensureCallerCanManageOwnership(caller.role, userId, conversation.ownerId)

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        state: 'PENDING',
        queueState: 'ON_HOLD',
        assignedAt: new Date(),
        assignedById: userId,
      },
    })

    this.emitEvent('conversation.resolved', {
      conversationId,
      performedById: userId,
      previousState: conversation.state,
      previousQueueState: conversation.queueState,
      queueState: 'ON_HOLD',
      assignedById: userId,
      conversation: updated,
    })

    return updated
  }

  async close(userId: string, conversationId: string) {
    const [conversation, caller] = await Promise.all([
      this.loadConversation(conversationId),
      this.loadUser(userId),
    ])

    if (!conversation) throw new Error('Conversation not found')
    if (!caller) throw new Error('Caller not found')
    if (conversation.state === 'CLOSED' || conversation.state === 'ARCHIVED') {
      throw new Error('Conversation is already closed or archived')
    }

    this.ensureCallerIsParticipantOrAdmin(caller.role, userId, conversation.participants.map((p) => p.userId))
    this.ensureCallerCanManageOwnership(caller.role, userId, conversation.ownerId)

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        state: 'CLOSED',
        queueState: 'ON_HOLD',
        closedAt: new Date(),
        assignedAt: new Date(),
        assignedById: userId,
      },
    })

    this.emitEvent('conversation.closed', {
      conversationId,
      performedById: userId,
      previousState: conversation.state,
      previousQueueState: conversation.queueState,
      queueState: 'ON_HOLD',
      assignedById: userId,
      conversation: updated,
    })

    return updated
  }

  async reopen(userId: string, conversationId: string) {
    const [conversation, caller] = await Promise.all([
      this.loadConversation(conversationId),
      this.loadUser(userId),
    ])

    if (!conversation) throw new Error('Conversation not found')
    if (!caller) throw new Error('Caller not found')
    if (conversation.state !== 'CLOSED') {
      throw new Error('Only closed conversations can be reopened')
    }

    this.ensureCallerIsParticipantOrAdmin(caller.role, userId, conversation.participants.map((p) => p.userId))

    const queueState = conversation.ownerId ? 'ASSIGNED' : 'NEW'
    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        state: 'OPEN',
        queueState,
        assignedAt: conversation.ownerId ? new Date() : conversation.assignedAt,
        assignedById: conversation.ownerId ? userId : conversation.assignedById,
      },
    })

    this.emitEvent('conversation.reopened', {
      conversationId,
      performedById: userId,
      previousState: conversation.state,
      previousQueueState: conversation.queueState,
      queueState,
      assignedById: updated.assignedById,
      conversation: updated,
    })

    return updated
  }

  async handoffToAI(userId: string, conversationId: string) {
    const [conversation, caller] = await Promise.all([
      this.loadConversation(conversationId),
      this.loadUser(userId),
    ])

    if (!conversation) throw new Error('Conversation not found')
    if (!caller) throw new Error('Caller not found')
    if (conversation.state === 'CLOSED' || conversation.state === 'ARCHIVED') {
      throw new Error('Cannot handoff a closed or archived conversation to AI')
    }

    this.ensureCallerIsParticipantOrAdmin(caller.role, userId, conversation.participants.map((p) => p.userId))
    this.ensureCallerCanManageOwnership(caller.role, userId, conversation.ownerId)

    const metadata = this.normalizeMetadata(conversation.metadata)
    metadata.workflow = {
      ...((metadata.workflow as Record<string, unknown>) ?? {}),
      handoff: 'AI',
      handoffAt: new Date().toISOString(),
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        metadata: this.metadataCreateInput(metadata),
        queueState: 'ON_HOLD',
      },
    })

    this.emitEvent('conversation.handoffToAI', {
      conversationId,
      performedById: userId,
      previousQueueState: conversation.queueState,
      queueState: 'ON_HOLD',
      metadata,
      conversation: updated,
    })

    return updated
  }

  async addAISummary(userId: string, conversationId: string, summary: string) {
    const [conversation, caller] = await Promise.all([
      this.loadConversation(conversationId),
      this.loadUser(userId),
    ])

    if (!conversation) throw new Error('Conversation not found')
    if (!caller) throw new Error('Caller not found')

    this.ensureCallerIsParticipantOrAdmin(caller.role, userId, conversation.participants.map((p) => p.userId))

    const metadata = this.normalizeMetadata(conversation.metadata)
    metadata.aiSummary = summary
    metadata.aiSummaryAt = new Date().toISOString()

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        metadata: this.metadataCreateInput(metadata),
      },
    })

    this.emitEvent('conversation.ai.summarized', {
      conversationId,
      performedById: userId,
      metadata,
      conversation: updated,
    })

    return updated
  }

  async addAISuggestions(userId: string, conversationId: string, suggestions: string[]) {
    const [conversation, caller] = await Promise.all([
      this.loadConversation(conversationId),
      this.loadUser(userId),
    ])

    if (!conversation) throw new Error('Conversation not found')
    if (!caller) throw new Error('Caller not found')

    this.ensureCallerIsParticipantOrAdmin(caller.role, userId, conversation.participants.map((p) => p.userId))

    const metadata = this.normalizeMetadata(conversation.metadata)
    metadata.aiSuggestions = suggestions
    metadata.aiSuggestionsAt = new Date().toISOString()

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        metadata: this.metadataCreateInput(metadata),
      },
    })

    this.emitEvent('conversation.ai.suggested', {
      conversationId,
      performedById: userId,
      metadata,
      conversation: updated,
    })

    return updated
  }

  async addAIReply(userId: string, conversationId: string, reply: { content: string; confidence: number; sources?: Array<{ documentId: string; score: number }> }) {
    const [conversation, caller] = await Promise.all([
      this.loadConversation(conversationId),
      this.loadUser(userId),
    ])

    if (!conversation) throw new Error('Conversation not found')
    if (!caller) throw new Error('Caller not found')

    this.ensureCallerIsParticipantOrAdmin(caller.role, userId, conversation.participants.map((p) => p.userId))

    const metadata = this.normalizeMetadata(conversation.metadata)
    const aiReplies = Array.isArray((metadata as any).aiReplies) ? (metadata as any).aiReplies as any[] : []
    aiReplies.push({ content: reply.content, confidence: reply.confidence, sources: reply.sources ?? [], createdAt: new Date().toISOString() })
    ;(metadata as any).aiReplies = aiReplies
    metadata.aiRepliesAt = new Date().toISOString()

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        metadata: this.metadataCreateInput(metadata),
      },
    })

    this.emitEvent('conversation.ai.replied', {
      conversationId,
      performedById: userId,
      metadata,
      conversation: updated,
    })

    return updated
  }

  async requestAIOperation(userId: string, conversationId: string, reason: string, targetAgentId?: string) {
    const [conversation, caller] = await Promise.all([
      this.loadConversation(conversationId),
      this.loadUser(userId),
    ])

    if (!conversation) throw new Error('Conversation not found')
    if (!caller) throw new Error('Caller not found')

    this.ensureCallerIsParticipantOrAdmin(caller.role, userId, conversation.participants.map((p) => p.userId))

    const metadata = this.normalizeMetadata(conversation.metadata)
    metadata.aiHandoffRequest = {
      reason,
      requestedAt: new Date().toISOString(),
      targetAgentId: targetAgentId ?? null,
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        metadata: this.metadataCreateInput(metadata),
      },
    })

    this.emitEvent('conversation.ai.handoffRequested', {
      conversationId,
      performedById: userId,
      metadata,
      conversation: updated,
      aiHandoffReason: reason,
      ownerId: updated.ownerId,
    })

    return updated
  }

  async handoffToAgent(userId: string, conversationId: string, agentId: string) {
    const [conversation, caller, target] = await Promise.all([
      this.loadConversation(conversationId),
      this.loadUser(userId),
      this.loadUser(agentId),
    ])

    if (!conversation) throw new Error('Conversation not found')
    if (!caller) throw new Error('Caller not found')
    if (!target) throw new Error('Target agent not found')
    if (!this.isAgentRole(target.role)) throw new Error('Target user is not an agent')
    if (conversation.state === 'CLOSED' || conversation.state === 'ARCHIVED') {
      throw new Error('Cannot handoff a closed or archived conversation to an agent')
    }

    this.ensureCallerIsParticipantOrAdmin(caller.role, userId, conversation.participants.map((p) => p.userId))
    this.ensureCallerCanManageOwnership(caller.role, userId, conversation.ownerId)

    const metadata = this.normalizeMetadata(conversation.metadata)
    if (metadata.workflow && typeof metadata.workflow === 'object') {
      delete (metadata.workflow as Record<string, unknown>).handoff
      delete (metadata.workflow as Record<string, unknown>).handoffAt
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ownerId: agentId,
        queueState: 'ASSIGNED',
        assignedAt: new Date(),
        assignedById: userId,
        metadata: this.metadataCreateInput(metadata),
      },
    })

    this.emitEvent('conversation.handoffToAgent', {
      conversationId,
      performedById: userId,
      previousOwnerId: conversation.ownerId,
      ownerId: agentId,
      assignedById: userId,
      queueState: 'ASSIGNED',
      metadata,
      conversation: updated,
    })

    return updated
  }
}

export const conversationWorkflowService = new ConversationWorkflowService()
