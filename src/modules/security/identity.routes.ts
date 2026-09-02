import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '../../config/prisma'
import { authMiddleware } from '../../middleware/auth.middleware'
import { requireCompanyContext } from '../../middleware/company.middleware'
import { requireRole } from '../../middleware/authorize.middleware'
import { identityService } from './identity.service'
import { auditLogService } from '../audit/audit.service'
import PasswordService from '../auth/password.service'

const router = Router()
const admin = [authMiddleware, requireCompanyContext, requireRole(['ADMIN', 'SUPER_ADMIN'])]
const provider = z.enum(['OKTA', 'AZURE_AD', 'GOOGLE_WORKSPACE'])
const companyId = z.string().uuid()
const tokenHash = (value: string) => crypto.createHash('sha256').update(value).digest('hex')

async function scimAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') || ''
  if (!header.startsWith('Bearer ')) return res.status(401).json({ detail: 'SCIM bearer token required' })
  const raw = header.slice(7)
  const token = await (prisma as any).scimToken.findFirst({ where: { tokenHash: tokenHash(raw), active: true } })
  if (!token) return res.status(401).json({ detail: 'Invalid SCIM bearer token' })
  req.companyId = token.companyId
  await (prisma as any).scimToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } })
  next()
}

router.get('/security/policy', ...admin, async (req, res) => res.json({ success: true, data: await identityService.getPolicy(req.companyId!) }))
router.patch('/security/policy', ...admin, async (req, res) => { const input = z.object({ minPasswordLength: z.number().int().min(8).max(128).optional(), requireUppercase: z.boolean().optional(), requireLowercase: z.boolean().optional(), requireNumber: z.boolean().optional(), requireSymbol: z.boolean().optional(), sessionTimeoutMinutes: z.number().int().min(5).max(43200).optional(), allowedEmailDomains: z.array(z.string().min(1)).max(100).optional(), ipAllowlist: z.array(z.string().min(1)).max(100).optional() }).parse(req.body); res.json({ success: true, data: await identityService.updatePolicy(req.companyId!, input, req.userId) }) })
router.get('/security/dashboard', ...admin, async (req, res) => { const [policy, sessions, keys, sso, scim] = await Promise.all([identityService.getPolicy(req.companyId!), identityService.companySessions(req.companyId!), (prisma as any).companyApiKey.findMany({ where: { companyId: req.companyId }, select: { id: true, name: true, scopes: true, expiresAt: true, lastUsedAt: true, revokedAt: true } }), (prisma as any).ssoConnection.findMany({ where: { companyId: req.companyId }, select: { id: true, provider: true, enabled: true, createdAt: true } }), (prisma as any).scimToken.count({ where: { companyId: req.companyId, active: true } })]); res.json({ success: true, data: { policy, sessions, apiKeys: keys, ssoConnections: sso, activeScimTokens: scim } }) })
router.post('/security/sessions/:userId/logout-all', ...admin, async (req, res) => { await identityService.revokeAllCompanyUserSessions(req.companyId!, String(req.params.userId)); res.status(204).send() })
router.post('/scim/token', ...admin, async (req, res) => res.status(201).json({ success: true, data: await identityService.createScimToken(req.companyId!, req.userId) }))

router.post('/auth/mfa/setup', ...[authMiddleware, requireCompanyContext], async (req, res) => { const result = await identityService.beginMfa(req.userId!); res.status(201).json({ success: true, data: result }) })
router.post('/auth/mfa/enable', ...[authMiddleware, requireCompanyContext], async (req, res) => { const body = z.object({ token: z.string().regex(/^\d{6}$/) }).parse(req.body); res.json({ success: true, data: await identityService.enableMfa(req.userId!, body.token) }) })
router.post('/auth/mfa/disable', ...[authMiddleware, requireCompanyContext], async (req, res) => { const body = z.object({ token: z.string().min(6).max(32) }).parse(req.body); res.json({ success: true, data: await identityService.disableMfa(req.userId!, body.token) }) })
router.get('/auth/sessions', ...[authMiddleware, requireCompanyContext], async (req, res) => res.json({ success: true, data: await identityService.sessions(req.userId!) }))
router.delete('/auth/sessions/:id', ...[authMiddleware, requireCompanyContext], async (req, res) => { await identityService.revokeSession(req.userId!, String(req.params.id)); res.status(204).send() })
router.post('/auth/sessions/logout-all', ...[authMiddleware, requireCompanyContext], async (req, res) => { await identityService.revokeAllSessions(req.userId!); res.status(204).send() })

router.put('/sso/:companyId/:provider', ...admin, async (req, res) => { const cid = companyId.parse(req.params.companyId); if (cid !== req.companyId) return res.status(403).json({ detail: 'Company access denied' }); const p = provider.parse(req.params.provider); const input = z.object({ entityId: z.string().url(), ssoUrl: z.string().url(), certificate: z.string().min(100) }).parse(req.body); res.json({ success: true, data: await identityService.configureSso(cid, p, input, req.userId) }) })
router.get('/sso/:companyId/:provider/login', async (req, res) => { const cid = companyId.parse(req.params.companyId); const p = provider.parse(req.params.provider); const callback = `${req.protocol}://${req.get('host')}/api/identity/sso/${cid}/${p}/acs`; res.redirect(await identityService.ssoLogin(cid, p, callback)) })
router.post('/sso/:companyId/:provider/acs', async (req, res) => { const cid = companyId.parse(req.params.companyId); const p = provider.parse(req.params.provider); const callback = `${req.protocol}://${req.get('host')}/api/identity/sso/${cid}/${p}/acs`; const result = await identityService.ssoCallback(cid, p, callback, req.body as Record<string, string>); res.json({ success: true, data: result }) })

router.get('/scim/v2/Users', scimAuth, async (req, res) => { const users = await (prisma as any).user.findMany({ where: { companyId: req.companyId, provisionedByScim: true }, select: { id: true, email: true, isActive: true, scimExternalId: true } }); res.json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'], totalResults: users.length, Resources: users.map((u: any) => ({ id: u.id, externalId: u.scimExternalId, userName: u.email, active: u.isActive, emails: [{ value: u.email, primary: true }] })) }) })
router.post('/scim/v2/Users', scimAuth, async (req, res) => { const body = z.object({ externalId: z.string().min(1), userName: z.string().email(), active: z.boolean().optional(), name: z.object({ givenName: z.string().optional(), familyName: z.string().optional() }).optional() }).parse(req.body); const existing = await (prisma as any).user.findFirst({ where: { companyId: req.companyId, OR: [{ scimExternalId: body.externalId }, { email: body.userName.toLowerCase() }] } }); const user = existing ? await (prisma as any).user.update({ where: { id: existing.id }, data: { email: body.userName.toLowerCase(), isActive: body.active ?? true, scimExternalId: body.externalId, provisionedByScim: true } }) : await (prisma as any).user.create({ data: { username: body.userName.toLowerCase(), email: body.userName.toLowerCase(), password: await PasswordService.hash(crypto.randomBytes(32).toString('hex')), companyId: req.companyId, isActive: body.active ?? true, scimExternalId: body.externalId, provisionedByScim: true } }); res.status(existing ? 200 : 201).json({ id: user.id, externalId: user.scimExternalId, userName: user.email, active: user.isActive }) })
router.patch('/scim/v2/Users/:id', scimAuth, async (req, res) => { const body = z.object({ active: z.boolean().optional(), userName: z.string().email().optional() }).parse(req.body); const user = await (prisma as any).user.findFirst({ where: { id: String(req.params.id), companyId: req.companyId, provisionedByScim: true } }); if (!user) return res.status(404).json({ detail: 'User not found' }); const updated = await (prisma as any).user.update({ where: { id: user.id }, data: { isActive: body.active ?? user.isActive, ...(body.userName ? { email: body.userName.toLowerCase(), username: body.userName.toLowerCase() } : {}) } }); res.json({ id: updated.id, userName: updated.email, active: updated.isActive }) })
router.delete('/scim/v2/Users/:id', scimAuth, async (req, res) => { const user = await (prisma as any).user.findFirst({ where: { id: String(req.params.id), companyId: req.companyId, provisionedByScim: true } }); if (!user) return res.status(404).json({ detail: 'User not found' }); await (prisma as any).user.update({ where: { id: user.id }, data: { isActive: false } }); await auditLogService.log(req.companyId, 'USER_DELETED' as any, 'user', user.id, undefined, { source: 'SCIM' }); res.status(204).send() })
router.get('/scim/v2/Groups', scimAuth, async (req, res) => { const groups = await (prisma as any).scimGroup.findMany({ where: { companyId: req.companyId } }); res.json({ schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'], totalResults: groups.length, Resources: groups }) })
router.put('/scim/v2/Groups/:id', scimAuth, async (req, res) => { const body = z.object({ displayName: z.string().min(1), members: z.array(z.object({ value: z.string() })).default([]) }).parse(req.body); const group = await (prisma as any).scimGroup.upsert({ where: { companyId_externalId: { companyId: req.companyId!, externalId: String(req.params.id) } }, update: { displayName: body.displayName, members: body.members }, create: { companyId: req.companyId!, externalId: String(req.params.id), displayName: body.displayName, members: body.members } }); res.json(group) })

export default router