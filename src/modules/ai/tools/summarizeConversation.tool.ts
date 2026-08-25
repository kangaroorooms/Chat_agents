import { z } from 'zod'
import type { AITool } from './tool.types'
import { getAIService } from '../ai.service'
import { loadConversationHistory } from '../ai.memory'
import { conversationWorkflowService } from '../../conversations/conversation.workflow'

const schema = z.object({
  conversationId: z.string(),
  performedById: z.string().optional(),
})

export const SummarizeConversationTool: AITool<z.infer<typeof schema>, { summary: string }> = {
  name: 'summarizeConversation',
  description: 'Generate a conversation summary and store it on the conversation metadata',
  inputSchema: schema,
  async execute(input) {
    const ai = getAIService()
    // Load conversation messages via AI service helper
    // AI service exposes summarizeConversation(messages[]), but we only have id here;
    // We'll leverage ai.orchestration helper to load history; fallback: call aiService.summarizeConversation with empty array if unavailable
    // For simplicity, getAIService provides summarizeConversation that accepts messages array;
    const messages = await loadConversationHistory(input.conversationId)
    const summary = await ai.summarizeConversation(messages)

    await conversationWorkflowService.addAISummary(input.performedById || 'AI_SYSTEM', input.conversationId, summary.summary)

    return { summary: summary.summary }
  },
}
