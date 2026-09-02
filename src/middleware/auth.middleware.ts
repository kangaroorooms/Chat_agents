import { Request, Response, NextFunction } from 'express'
import TokenService, { JwtPayload } from '../modules/auth/token.service'
import { identityService } from '../modules/security/identity.service'

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.apiKey) return next()
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ message: 'Token missing' })
  }

  if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ message: 'Invalid authorization header' })
  const token = authHeader.slice(7)

  try {
    const decoded = TokenService.verify<JwtPayload>(token)

    req.user = decoded
    req.userId = decoded.userId
    if (decoded.companyId) await identityService.enforcePolicy(decoded.companyId, req.ip)
    return next()
  } catch (error) {
    return res.status(error instanceof Error && error.message === 'IP address is not allowed' ? 403 : 401).json({ message: error instanceof Error ? error.message : 'Invalid token' })
  }
}
