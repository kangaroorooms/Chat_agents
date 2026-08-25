import { z } from 'zod'

export const CreateConversationSchema = z.object({
  participantId: z.string().min(1),
  title: z.string().max(255).optional(),
})

export const ListConversationsQuery = z.object({
  limit: z.preprocess((v) => Number(v), z.number().int().min(1).max(100)).optional().default(20),
  cursor: z.string().uuid().optional(),
  search: z.string().optional(),
  state: z.enum(['OPEN','PENDING','CLOSED','ARCHIVED']).optional(),
})

export const ChangeStateSchema = z.object({
  state: z.enum(['OPEN','PENDING','CLOSED','ARCHIVED'])
})

export const ParticipantSchema = z.object({
  userId: z.string().uuid(),
})

export const AssignOwnerSchema = z.object({
  ownerId: z.string().uuid(),
})

export const TransferConversationSchema = z.object({
  toAgentId: z.string().uuid(),
})

export const EscalateConversationSchema = z.object({
  targetAgentId: z.string().uuid().optional(),
})

export const HandoffToAgentSchema = z.object({
  agentId: z.string().uuid(),
})

export type CreateConversationDto = z.infer<typeof CreateConversationSchema>
export type ListConversationsQueryDto = z.infer<typeof ListConversationsQuery>
export type ChangeStateDto = z.infer<typeof ChangeStateSchema>
export type ParticipantDto = z.infer<typeof ParticipantSchema>
export type AssignOwnerDto = z.infer<typeof AssignOwnerSchema>
export type TransferConversationDto = z.infer<typeof TransferConversationSchema>
export type EscalateConversationDto = z.infer<typeof EscalateConversationSchema>
export type HandoffToAgentDto = z.infer<typeof HandoffToAgentSchema>
