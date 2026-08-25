import { domainEventBus } from '../events/domain-event-bus'
import type { ConversationDomainEventName, DomainEventPayloadMap } from '../events/domain-events'
import { conversationWorkflowService } from '../conversations/conversation.workflow'
import { getAIService } from './ai.service'
import { loadConversationHistory } from './ai.memory'
import { toolRegistry } from './tools'

const AI_USER_ID = 'ai-system'

const shouldAutoSuggest = (payload: DomainEventPayloadMap['conversation.assigned']) => {
  return payload.queueState === 'ASSIGNED' || payload.queueState === 'ESCALATED'
}

const handleAssigned = async (payload: DomainEventPayloadMap['conversation.assigned']) => {
  if (!shouldAutoSuggest(payload)) return

  try {
    const aiService = getAIService()
    const messages = await loadConversationHistory(payload.conversationId)
    const lastMessage = messages[messages.length - 1]

    if (!lastMessage) return

    const suggestions = await aiService.generateSuggestions(
      payload.conversationId,
      lastMessage.content
    )

    await conversationWorkflowService.addAISuggestions(
      AI_USER_ID,
      payload.conversationId,
      suggestions.suggestions
    )
  } catch (error) {
    console.error('[AI] Error generating suggestions:', error)
  }
}

const handleConversationEvent = async (payload: DomainEventPayloadMap[ConversationDomainEventName]) => {
  try {
    // Use tool registry to summarize conversations (tool handles storage via workflow)
    await toolRegistry.execute('summarizeConversation', { conversationId: payload.conversationId, performedById: AI_USER_ID })
  } catch (error) {
    console.error('[AI] Error summarizing conversation:', error)
  }
}

const handleHandoffRequested = async (payload: DomainEventPayloadMap['conversation.ai.handoffRequested']) => {
  // no direct state changes here; workflow owns all transitions
  console.debug('[AI] handoff requested', payload.aiHandoffReason, payload.conversationId)
}

const init = () => {
  domainEventBus.on('conversation.assigned', handleAssigned)
  domainEventBus.on('conversation.transferred', handleConversationEvent)
  domainEventBus.on('conversation.escalated', handleConversationEvent)
  domainEventBus.on('conversation.resolved', handleConversationEvent)
  domainEventBus.on('conversation.closed', handleConversationEvent)
  domainEventBus.on('conversation.reopened', handleConversationEvent)
  domainEventBus.on('conversation.handoffToAI', handleConversationEvent)
  domainEventBus.on('conversation.handoffToAgent', handleConversationEvent)
  domainEventBus.on('conversation.ai.handoffRequested', handleHandoffRequested)
}

export default {
  init,
}
