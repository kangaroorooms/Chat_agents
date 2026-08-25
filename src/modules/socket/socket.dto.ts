import { z } from 'zod'

export const RoomJoinSchema = z.object({
  type: z.enum(['conversation', 'company', 'agent']),
  id: z.string().uuid(),
})

export const RoomLeaveSchema = RoomJoinSchema

export const TypingSchema = z.object({
  conversationId: z.string().uuid(),
  status: z.enum(['start', 'stop']),
})

export const DeliverySchema = z.object({
  messageId: z.string().uuid(),
})

export const ReadSchema = z.object({
  messageId: z.string().uuid(),
})

export const ConversationReadSchema = z.object({
  conversationId: z.string().uuid(),
})

export const ConversationAssignSchema = z.object({
  conversationId: z.string().uuid(),
  ownerId: z.string().uuid(),
})

export const ConversationTransferSchema = z.object({
  conversationId: z.string().uuid(),
  toAgentId: z.string().uuid(),
})

export const AgentJoinSchema = z.object({
  agentId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
})

export type RoomJoinDto = z.infer<typeof RoomJoinSchema>
export type TypingDto = z.infer<typeof TypingSchema>
export type DeliveryDto = z.infer<typeof DeliverySchema>
export type ReadDto = z.infer<typeof ReadSchema>
export type ConversationReadDto = z.infer<typeof ConversationReadSchema>
export type ConversationAssignDto = z.infer<typeof ConversationAssignSchema>
export type ConversationTransferDto = z.infer<typeof ConversationTransferSchema>
export type AgentJoinDto = z.infer<typeof AgentJoinSchema>
