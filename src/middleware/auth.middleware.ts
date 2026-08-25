import { Request, Response, NextFunction } from 'express'
import TokenService, { JwtPayload } from '../modules/auth/token.service'

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ message: 'Token missing' })
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const decoded = TokenService.verify<JwtPayload>(token)

    req.user = decoded
    req.userId = decoded.userId
    return next()
  } catch {
    return res.status(401).json({ message: 'Invalid token' })
  }
}
