import { z } from 'zod'
import type { AITool } from './tool.types'
import { conversationWorkflowService } from '../../conversations/conversation.workflow'

const schema = z.object({
  performedById: z.string(),
  conversationId: z.string(),
  toAgentId: z.string(),
})

export const TransferConversationTool: AITool<z.infer<typeof schema>, any> = {
  name: 'transferConversation',
  description: 'Transfer conversation ownership to another agent via workflow',
  inputSchema: schema,
  async execute(input) {
    return conversationWorkflowService.transfer(input.performedById, input.conversationId, input.toAgentId)
  },
}
