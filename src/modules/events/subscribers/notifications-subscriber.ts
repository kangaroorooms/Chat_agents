import { domainEventBus } from '../domain-event-bus'
import type { ConversationDomainEventName, DomainEventPayloadMap } from '../domain-events'
import { prisma } from '../../../config/prisma'
import { enqueue } from '../../../infrastructure/queues'

const subscribe = () => {
  const webhookEvents: Partial<Record<ConversationDomainEventName, string>> = {
    'conversation.assigned': 'CONVERSATION_ASSIGNED',
    'conversation.resolved': 'CONVERSATION_RESOLVED',
    'conversation.closed': 'CONVERSATION_RESOLVED',
  }
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
    domainEventBus.on(event, async (payload: DomainEventPayloadMap[typeof event]) => {
      if (!payload.conversation.companyId) return
      const webhookEvent = webhookEvents[event]
      if (!webhookEvent) return
      const webhooks = await (prisma as any).webhook.findMany({ where: { companyId: payload.conversation.companyId, status: 'ACTIVE', events: { has: webhookEvent } } })
      await Promise.all(webhooks.map((webhook: any) => enqueue({ queue: 'webhook', name: 'deliver', data: { webhookId: webhook.id, event: webhookEvent, payload } })))
    })
  })
}

export default {
  init: subscribe,
}
