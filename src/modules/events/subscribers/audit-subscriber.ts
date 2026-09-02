import { domainEventBus } from '../domain-event-bus'
import type { ConversationDomainEventName, DomainEventPayloadMap } from '../domain-events'
import { auditLogService } from '../../audit/audit.service'

const actions: Partial<Record<ConversationDomainEventName, 'CONVERSATION_ASSIGNED' | 'CONVERSATION_RESOLVED' | 'AI_RESPONSE_GENERATED' | 'AI_HANDOFF'>> = { 'conversation.assigned': 'CONVERSATION_ASSIGNED', 'conversation.resolved': 'CONVERSATION_RESOLVED', 'conversation.ai.replied': 'AI_RESPONSE_GENERATED', 'conversation.ai.handoffRequested': 'AI_HANDOFF', 'conversation.handoffToAI': 'AI_HANDOFF', 'conversation.handoffToAgent': 'AI_HANDOFF' }
const subscribe = () => {
  ;(Object.keys(actions) as ConversationDomainEventName[]).forEach((event) => domainEventBus.on(event, (payload: DomainEventPayloadMap[typeof event]) => {
    const action = actions[event]
    if (action && payload.conversation.companyId) void auditLogService.log(payload.conversation.companyId, action, 'conversation', payload.conversationId, payload.performedById, { event, ownerId: payload.ownerId ?? null }).catch((error) => console.error('Audit write failed', error))
  }))
}
export default { init: subscribe }
