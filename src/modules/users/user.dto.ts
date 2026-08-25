import { z } from 'zod'

export const UserRoleSchema = z.enum(['CUSTOMER', 'AGENT', 'ADMIN', 'SUPER_ADMIN'])

export const CreateUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: UserRoleSchema.default('CUSTOMER'),
  companyId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional().default(true),
})

export const UpdateUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: UserRoleSchema.optional(),
  companyId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
})

export const ListUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: UserRoleSchema.optional(),
  cursor: z.string().uuid().optional(),
  limit: z.preprocess((value) => Number(value), z.number().int().min(1).max(100)).optional().default(50),
})

export type CreateUserDto = z.infer<typeof CreateUserSchema>
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>
export type ListUsersQueryDto = z.infer<typeof ListUsersQuerySchema>
export type UserRoleDto = z.infer<typeof UserRoleSchema>
