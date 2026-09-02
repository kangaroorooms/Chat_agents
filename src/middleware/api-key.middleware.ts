import { Request, Response, NextFunction } from 'express'
import { apiKeyService } from '../modules/security/api-key.service'
import { auditLogService } from '../modules/audit/audit.service'
import type { CompanyApiKeyScope } from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      companyId?: string
      apiKey?: boolean
      apiKeyScopes?: string[]
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
  if (!key.startsWith('sk_')) return next()
  const result = await apiKeyService.verifyKey(key)

  if (!result) {
    return res.status(401).json({ success: false, message: 'Invalid API key' })
  }

  req.companyId = result.companyId
  req.apiKey = true
  req.apiKeyScopes = result.scopes
  void auditLogService.log(result.companyId, 'API_KEY_USED', 'api_key', 'authenticated', undefined, { path: req.path, method: req.method })
  next()
}

export const requireApiKeyScope = (scope: string) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.apiKey || req.apiKeyScopes?.includes(scope) || req.apiKeyScopes?.includes('*')) return next()
  void auditLogService.log(req.companyId, 'API_KEY_SCOPE_DENIED' as any, 'api_key', 'request', undefined, { scope, path: req.path, method: req.method })
  return res.status(403).json({ success: false, message: 'API key scope required' })
}

export const apiKeyScopeGuard = (req: Request, res: Response, next: NextFunction) => {
  if (!req.apiKey) return next()
  const required: CompanyApiKeyScope = req.method === 'GET' || req.method === 'HEAD' ? 'READ' : req.path.includes('/security/') || req.path.includes('/api-keys') ? 'ADMIN' : 'WRITE'
  if (req.apiKeyScopes?.includes(required) || req.apiKeyScopes?.includes('ADMIN')) return next()
  void auditLogService.log(req.companyId, 'API_KEY_SCOPE_DENIED' as any, 'api_key', 'request', undefined, { scope: required, path: req.path, method: req.method })
  return res.status(403).json({ success: false, message: `API key requires ${required} scope` })
}
