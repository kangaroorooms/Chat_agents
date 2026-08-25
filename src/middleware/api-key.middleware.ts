import { Request, Response, NextFunction } from 'express'
import { apiKeyService } from '../security/api-key.service'

declare global {
  namespace Express {
    interface Request {
      companyId?: string
      apiKey?: boolean
    }
  }
}

/**
 * Authenticate using API key
 */
export const authenticateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next() // Continue to next middleware (JWT auth)
  }

  const key = authHeader.substring(7)
  const result = await apiKeyService.verifyKey(key)

  if (!result) {
    return res.status(401).json({ success: false, message: 'Invalid API key' })
  }

  req.companyId = result.companyId
  req.apiKey = true
  next()
}
