import { z } from 'zod'

export const CreateMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().max(6000).optional(),
  type: z.enum(['TEXT','IMAGE','FILE','SYSTEM','AI','AUDIO','VIDEO','LOCATION','CAROUSEL']).default('TEXT'),
  metadata: z.any().optional(),
  replyToId: z.string().uuid().optional(),
})

export const ListMessagesQuery = z.object({
  limit: z.preprocess((v) => Number(v), z.number().int().min(1).max(200)).optional().default(50),
  cursor: z.string().uuid().optional(),
})

export const EditMessageSchema = z.object({
  content: z.string().min(1).max(6000),
  metadata: z.any().optional(),
})

export type CreateMessageDto = z.infer<typeof CreateMessageSchema>
export type ListMessagesQueryDto = z.infer<typeof ListMessagesQuery>
export type EditMessageDto = z.infer<typeof EditMessageSchema>
