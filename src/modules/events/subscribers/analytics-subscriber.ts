import { domainEventBus } from '../domain-event-bus'
import type { ConversationDomainEventName, DomainEventPayloadMap } from '../domain-events'

const subscribe = () => {
  const placeholderEvents: Array<ConversationDomainEventName> = [
    'conversation.assigned',
    'conversation.transferred',
    'conversation.escalated',
    'conversation.resolved',
    'conversation.closed',
    'conversation.reopened',
    'conversation.handoffToAI',
    'conversation.handoffToAgent',
  ]

  placeholderEvents.forEach((event) => {
    domainEventBus.on(event, (payload: DomainEventPayloadMap[typeof event]) => {
      // placeholder: hook into analytics pipeline here
      console.debug('[ANALYTICS] event received', event, payload.conversationId)
    })
  })
}

export default {
  init: subscribe,
}
