import { z } from 'zod'
import type { AITool } from './tool.types'
import { conversationWorkflowService } from '../../conversations/conversation.workflow'

const schema = z.object({
  performedById: z.string(),
  conversationId: z.string(),
  ownerId: z.string(),
})

export const AssignConversationTool: AITool<z.infer<typeof schema>, any> = {
  name: 'assignConversation',
  description: 'Assign a conversation to an agent via workflow',
  inputSchema: schema,
  async execute(input) {
    return conversationWorkflowService.assign(input.performedById, input.conversationId, input.ownerId)
  },
}
