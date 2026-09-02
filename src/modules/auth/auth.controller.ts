import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

import { AuthService } from './auth.service'
import refreshTokenService from './refreshToken.service'
import type { RefreshToken, User } from '@prisma/client'
import { RegisterSchema, LoginSchema } from './auth.dto'
import CookieService from './cookie.service'
import TokenService, { JwtPayload } from './token.service'
import AuthConfig from '../../config/auth'
import { auditLogService } from '../audit/audit.service'
import { identityService } from '../security/identity.service'

const authService = new AuthService()

const getUserIdFromRequest = (req: Request): string | null => {
  return req.user?.userId || req.userId || null
}

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = RegisterSchema.safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid payload', details: parsed.error.format() })
    }

    const { username, email, password } = parsed.data

    const user = await authService.register(username, email, password)

    return res.status(201).json(user)
  } catch (error) {
    return next(error)
  }
}

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = LoginSchema.safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid payload', details: parsed.error.format() })
    }

    const { email, password, mfaToken } = parsed.data

    let result
    try {
      result = await authService.login(email, password, mfaToken)
    } catch (err: any) {
      const msg = err?.message || String(err)
      if (msg === 'Invalid credentials') { void auditLogService.log(null, 'LOGIN_FAILED', 'user', 'unknown', undefined, { email }); return res.status(401).json({ message: 'Invalid credentials' }) }
      if (msg === 'Account inactive') { void auditLogService.log(null, 'LOGIN_FAILED', 'user', 'inactive', undefined, { email }); return res.status(403).json({ message: 'Account disabled' }) }
      if (msg === 'MFA required') return res.status(401).json({ message: 'MFA required' })
      return next(err)
    }

    const ua = req.get('user-agent')
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip
    const deviceName = (req.body as { deviceName?: string }).deviceName || undefined
    const deviceId = (req.body as { deviceId?: string }).deviceId || undefined

    const refresh = await refreshTokenService.create(result.user.id, { deviceId, deviceName, ip, ua })
    if (result.user.companyId) void auditLogService.log(result.user.companyId, 'LOGIN_SUCCESS', 'user', result.user.id, result.user.id)

    res.cookie('refreshToken', refresh.token, CookieService.getRefreshCookieOptions())

    return res.json(result)
  } catch (error) {
    return next(error)
  }
}

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.cookies?.refreshToken as string | undefined
    if (!raw) return res.status(401).json({ message: 'Refresh token missing' })

    const record = await refreshTokenService.findByToken(raw)
    if (!record || record.isRevoked || record.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Invalid refresh token' })
    }

    if (!record.user || !record.user.isActive) {
      return res.status(403).json({ message: 'Account disabled' })
    }
    if (record.user.companyId) {
      const policy = await identityService.getPolicy(record.user.companyId)
      const sessionActivity = record.lastUsedAt?.getTime() ?? record.createdAt.getTime()
      if (sessionActivity + policy.sessionTimeoutMinutes * 60 * 1000 < Date.now()) return res.status(401).json({ message: 'Session expired' })
    }

    const origin = req.get('origin')
    if (origin && AuthConfig.security.allowedOrigins.indexOf(origin) === -1) {
      return res.status(403).json({ message: 'Origin not allowed' })
    }

    const ua = req.get('user-agent')
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip
    const rotated = await refreshTokenService.rotate(record.id, record.userId, { ua, ip })
    await refreshTokenService.markUsed(rotated.id)

    const payload: { userId: string; role?: string; companyId?: string } = { userId: record.userId }
    if (record.user?.role) payload.role = record.user.role
    if (record.user?.companyId) payload.companyId = record.user.companyId

    const accessToken = TokenService.sign(payload as unknown as JwtPayload)

    res.cookie('refreshToken', rotated.token, CookieService.getRefreshCookieOptions())
    return res.json({ token: accessToken })
  } catch (error) {
    return next(error)
  }
}

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.cookies?.refreshToken as string | undefined
    if (raw) {
      const record = await refreshTokenService.findByToken(raw)
      if (record) await refreshTokenService.revoke(record.id)
    }

    res.clearCookie('refreshToken', CookieService.clearRefreshCookieOptions())
    return res.json({ success: true })
  } catch (error) {
    return next(error)
  }
}

export const logoutAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserIdFromRequest(req)
    if (!userId) return res.status(401).json({ message: 'Missing auth' })

    await refreshTokenService.revokeAllForUser(userId)
    res.clearCookie('refreshToken', CookieService.clearRefreshCookieOptions())
    return res.json({ success: true })
  } catch (err) {
    return next(err)
  }
}

export const sessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserIdFromRequest(req)
    if (!userId) return res.status(401).json({ message: 'Missing auth' })

    const sessions = await refreshTokenService.listSessionsForUser(userId)
    const safe = (sessions || []).map((s) => ({
      id: s.id,
      deviceId: s.deviceId,
      deviceName: s.deviceName,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      lastUsedAt: s.lastUsedAt,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
      isRevoked: s.isRevoked,
    }))
    return res.json(safe)
  } catch (err) {
    return next(err)
  }
}

export const revokeSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = String(req.params.id)
    const userId = getUserIdFromRequest(req)
    if (!userId) return res.status(401).json({ message: 'Missing auth' })

    const session = (await refreshTokenService.listSessionsForUser(userId)).find((s) => s.id === sessionId)
    if (!session) return res.status(404).json({ message: 'Session not found' })

    await refreshTokenService.revoke(sessionId)
    return res.json({ success: true })
  } catch (err) {
    return next(err)
  }
}
