declare global {
  namespace Express {
    type UserRole = 'CUSTOMER' | 'AGENT' | 'ADMIN' | 'SUPER_ADMIN'

    interface UserPayload {
      userId: string
      role?: UserRole
      companyId?: string
    }

    interface Request {
      user?: UserPayload
      userId?: string
      companyId?: string
    }
  }
}

export {};
