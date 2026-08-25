import { domainEventBus } from '../domain-event-bus'
import type { ConversationDomainEventName, DomainEventPayloadMap } from '../domain-events'
import { auditLogService } from '../../audit/audit.service'

const actions: Partial<Record<ConversationDomainEventName, 'CONVERSATION_ASSIGNED' | 'CONVERSATION_RESOLVED'>> = { 'conversation.assigned': 'CONVERSATION_ASSIGNED', 'conversation.resolved': 'CONVERSATION_RESOLVED' }
const subscribe = () => {
  ;(Object.keys(actions) as ConversationDomainEventName[]).forEach((event) => domainEventBus.on(event, (payload: DomainEventPayloadMap[typeof event]) => {
    const action = actions[event]
    if (action && payload.conversation.companyId) void auditLogService.log(payload.conversation.companyId, action, 'conversation', payload.conversationId, payload.performedById, { event, ownerId: payload.ownerId ?? null }).catch((error) => console.error('Audit write failed', error))
  }))
}
export default { init: subscribe }
