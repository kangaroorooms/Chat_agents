import { prisma } from '../../config/prisma'
import type { ConversationContext, ConversationSummary } from './ai.types'
import type { Message } from '@prisma/client'

/**
 * Token estimation (rough approximation)
 * Average: 4 characters per token
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Load conversation history for context
 */
export async function loadConversationHistory(
  conversationId: string
): Promise<Message[]> {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 100, // limit to last 100 messages
  })

  return messages
}

/**
 * Build conversation context for AI
 */
export async function buildConversationContext(
  conversationId: string
): Promise<ConversationContext> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      owner: { select: { id: true, username: true } },
      assignedBy: { select: { id: true, username: true } },
    },
  })

  if (!conversation) {
    throw new Error(`Conversation not found: ${conversationId}`)
  }

  const messages = await loadConversationHistory(conversationId)

  return {
    conversationId,
    customerId: conversation.ownerId || '',
    agentId: conversation.assignedById || undefined,
    messages,
    metadata: conversation.metadata as Record<string, unknown> | undefined,
    recentMessageCount: messages.length,
  }
}

/**
 * Truncate message history to fit within token budget
 */
export function truncateContextWindow(
  messages: Message[],
  maxTokens: number
): Message[] {
  if (messages.length === 0) return []

  // Keep most recent messages
  let tokenCount = 0
  const truncated: Message[] = []

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    const msgTokens = estimateTokenCount(msg.content)

    if (tokenCount + msgTokens > maxTokens && truncated.length > 0) {
      break
    }

    truncated.unshift(msg)
    tokenCount += msgTokens
  }

  return truncated
}

/**
 * Build system prompt for conversation
 */
export function buildSystemPrompt(context: ConversationContext): string {
  const customerName = context.metadata?.customerName || 'valued customer'
  const issueType = context.metadata?.issueType || 'general inquiry'

  return `You are a helpful and professional customer support agent.

Conversation Details:
- Customer: ${customerName}
- Issue Type: ${issueType}
- Message Count: ${context.recentMessageCount}

Guidelines:
1. Be empathetic and professional
2. Provide clear and concise answers
3. If the issue is complex, offer to escalate to a human agent
4. Use the conversation history for context
5. Be honest if you don't know something
6. Offer specific next steps or solutions

Always maintain a helpful and respectful tone.`
}

/**
 * Format messages for API call
 */
export function formatMessagesForAPI(
  messages: Message[],
  role: 'system' | 'user' | 'assistant' = 'assistant'
): Array<{ role: string; content: string }> {
  return messages.map((msg) => ({
    role: msg.senderId === 'ai-system' ? 'assistant' : 'user',
    content: msg.content,
  }))
}

/**
 * Summarize conversation for long threads
 */
export async function summarizeConversation(
  messages: Message[]
): Promise<ConversationSummary> {
  if (messages.length === 0) {
    return {
      summary: 'No messages',
      keyPoints: [],
      generatedAt: new Date(),
    }
  }

  // Simple summarization logic (placeholder for LLM)
  const firstMessage = messages[0]?.content.substring(0, 100) || ''
  const lastMessage = messages[messages.length - 1]?.content.substring(0, 100) || ''

  return {
    summary: `Conversation with ${messages.length} messages starting with "${firstMessage}..." and ending with "${lastMessage}..."`,
    keyPoints: [
      `${messages.length} messages exchanged`,
      `Duration: ${messages[messages.length - 1] ? new Date(messages[messages.length - 1].createdAt).getTime() - new Date(messages[0].createdAt).getTime() : 0}ms`,
    ],
    generatedAt: new Date(),
  }
}
