export type UserRole = 'CUSTOMER' | 'AGENT' | 'ADMIN' | 'SUPER_ADMIN'

export const RolePermissions: Record<UserRole, string[]> = {
  CUSTOMER: ['chat:read', 'chat:write'],
  AGENT: ['chat:read', 'chat:write', 'conversation:manage', 'session:view'],
  ADMIN: ['*'],
  SUPER_ADMIN: ['*'],
}
