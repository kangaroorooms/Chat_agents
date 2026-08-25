import { z } from 'zod'

export const CreateCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  slug: z.string().min(1, 'Company slug is required'),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  widgetWelcomeMessage: z.string().trim().max(500).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
})

export const UpdateCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').optional(),
  slug: z.string().min(1, 'Company slug is required').optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  widgetWelcomeMessage: z.string().trim().max(500).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
})

export type CreateCompanyDto = z.infer<typeof CreateCompanySchema>
export type UpdateCompanyDto = z.infer<typeof UpdateCompanySchema>
