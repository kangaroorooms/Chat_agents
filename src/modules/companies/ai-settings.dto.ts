import { z } from 'zod'

export const CreateAISettingsSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'gemini']),
  apiKey: z.string().min(1, 'apiKey is required').optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  autoReplyEnabled: z.boolean().optional(),
  autoResolveEnabled: z.boolean().optional(),
  confidenceThreshold: z.number().min(0).max(1).optional(),
})

export const UpdateAISettingsSchema = CreateAISettingsSchema.partial()

export type CreateAISettingsDto = z.infer<typeof CreateAISettingsSchema>
export type UpdateAISettingsDto = z.infer<typeof UpdateAISettingsSchema>
