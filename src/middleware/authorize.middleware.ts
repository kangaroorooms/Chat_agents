import { Request, Response, NextFunction } from 'express'
import { RolePermissions, UserRole } from '../config/roles'

export const requireRole = (roles: UserRole | UserRole[]) => {
  const allowed = Array.isArray(roles) ? roles : [roles]
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user
    if (!user) return res.status(401).json({ message: 'Missing auth' })
    if (!user.role || allowed.indexOf(user.role) === -1) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    return next()
  }
}

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user
    if (!user) return res.status(401).json({ message: 'Missing auth' })
    const permissions = RolePermissions[user.role || 'CUSTOMER'] || []
    if (permissions.indexOf('*') === -1 && permissions.indexOf(permission) === -1) {
      return res.status(403).json({ message: 'Permission denied' })
    }
    return next()
  }
}
