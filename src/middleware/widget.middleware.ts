import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'

declare global {
  namespace Express { interface Request { widgetToken?: string } }
}

export async function requireWidgetToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-widget-token']
  const origin = req.headers.origin
  if (typeof token !== 'string' || !origin) return res.status(401).json({ success: false, message: 'Widget token and origin required' })
  const record = await (prisma as any).widgetToken.findFirst({ where: { token, active: true } })
  if (!record) return res.status(401).json({ success: false, message: 'Invalid widget token' })
  const domains = Array.isArray(record.allowedDomains) ? record.allowedDomains : []
  let hostname: string
  try { hostname = new URL(origin).hostname } catch { return res.status(403).json({ success: false, message: 'Invalid origin' }) }
  const allowed = domains.some((domain: unknown) => typeof domain === 'string' && (domain === origin || domain === hostname || domain === `https://${hostname}`))
  if (!allowed) return res.status(403).json({ success: false, message: 'Origin not allowed' })
  req.companyId = record.companyId
  req.widgetToken = crypto.createHash('sha256').update(token).digest('hex')
  return next()
}