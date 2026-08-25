import { domainEventBus } from '../domain-event-bus'
import type { ConversationDomainEventName, DomainEventPayloadMap } from '../domain-events'
import { SocketEvents } from '../../socket/eventRegistry'
import { getIo } from '../../socket/socket.server'

const addConversationEvent = (event: ConversationDomainEventName, socketEvent: string) => {
  domainEventBus.on(event, (payload) => {
    let io
    try {
      io = getIo()
    } catch {
      return
    }

    const conversationRoom = `conversation:${payload.conversationId}`
    io.to(conversationRoom).emit(socketEvent, payload)

    const updatePayload = {
      conversationId: payload.conversationId,
      ownerId: payload.ownerId ?? payload.conversation.ownerId ?? null,
      queueState: payload.queueState ?? payload.conversation.queueState,
    }

    const companyId = payload.conversation.companyId
    if (companyId) {
      io.to(`company:${companyId}`).emit(SocketEvents.CONVERSATION_UPDATED, updatePayload)
    }

    if (updatePayload.ownerId) {
      io.to(`user:${updatePayload.ownerId}`).emit(SocketEvents.CONVERSATION_UPDATED, updatePayload)
    }
  })
}

addConversationEvent('conversation.assigned', SocketEvents.CONVERSATION_ASSIGNED)
addConversationEvent('conversation.transferred', SocketEvents.CONVERSATION_TRANSFERRED)
addConversationEvent('conversation.escalated', SocketEvents.CONVERSATION_ESCALATED)
addConversationEvent('conversation.resolved', SocketEvents.CONVERSATION_RESOLVED)
addConversationEvent('conversation.closed', SocketEvents.CONVERSATION_CLOSED)
addConversationEvent('conversation.reopened', SocketEvents.CONVERSATION_REOPENED)
addConversationEvent('conversation.handoffToAI', SocketEvents.CONVERSATION_HANDOFF_AI)
addConversationEvent('conversation.handoffToAgent', SocketEvents.CONVERSATION_HANDOFF_AGENT)
addConversationEvent('conversation.ai.suggested', SocketEvents.CONVERSATION_AI_SUGGESTED)
addConversationEvent('conversation.ai.summarized', SocketEvents.CONVERSATION_AI_SUMMARIZED)
addConversationEvent('conversation.ai.handoffRequested', SocketEvents.CONVERSATION_AI_HANDOFF_REQUESTED)
addConversationEvent('conversation.ai.replied', SocketEvents.CONVERSATION_AI_REPLIED)

export default {
  init: () => null,
}
