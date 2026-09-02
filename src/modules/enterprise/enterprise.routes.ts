import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../config/prisma'
import { authMiddleware } from '../../middleware/auth.middleware'
import { requireCompanyContext } from '../../middleware/company.middleware'
import { requireRole } from '../../middleware/authorize.middleware'
import { billingService } from '../billing/billing.service'
import { slaService } from '../sla/sla.service'
import { apiKeyService } from '../security/api-key.service'
import { webhookService } from '../webhooks/webhook.service'
import { enqueue } from '../../infrastructure/queues'
import { auditLogService } from '../audit/audit.service'

const router = Router()
const secured = [authMiddleware, requireCompanyContext, requireRole(['ADMIN', 'SUPER_ADMIN'])]

router.get('/billing/plans', authMiddleware, async (_req, res) => res.json({ success: true, data: await billingService.getPlans() }))
router.get('/billing/subscription', ...secured, async (req, res) => res.json({ success: true, data: await billingService.getCompanySubscription(req.companyId!) }))
router.put('/billing/subscription', ...secured, async (req, res) => {
  const body = z.object({ planId: z.string().uuid(), currentPeriodStart: z.coerce.date(), currentPeriodEnd: z.coerce.date() }).parse(req.body)
  if (body.currentPeriodEnd <= body.currentPeriodStart) return res.status(400).json({ success: false, message: 'Invalid subscription period' })
  res.json({ success: true, data: await billingService.setCompanySubscription(req.companyId!, body.planId, body.currentPeriodStart, body.currentPeriodEnd) })
})

router.put('/sla/policy', ...secured, async (req, res) => { const b = z.object({ firstResponseMinutes: z.number().int().positive(), resolutionMinutes: z.number().int().positive() }).parse(req.body); res.json({ success: true, data: await slaService.setPolicy(req.companyId!, b.firstResponseMinutes, b.resolutionMinutes) }) })
router.get('/sla/metrics', ...secured, async (req, res) => res.json({ success: true, data: await slaService.getMetrics(req.companyId!) }))
router.post('/sla/check-breaches', ...secured, async (req, res) => { const jobId = await enqueue({ queue: 'sla', name: 'check-breaches', data: { companyId: req.companyId! } }); if (!jobId) return res.json({ success: true, data: { breached: await slaService.checkBreaches(req.companyId!) } }); return res.status(202).json({ success: true, data: { jobId } }) })

router.get('/analytics/agents', ...secured, async (req, res) => {
  const agents = await prisma.user.findMany({ where: { companyId: req.companyId, role: 'AGENT' }, select: { id: true, username: true, email: true, _count: { select: { ownedConversations: true } } } })
  const data = await Promise.all(agents.map(async (agent) => {
    const conversations = await prisma.conversation.findMany({ where: { companyId: req.companyId, ownerId: agent.id, closedAt: { not: null } }, select: { createdAt: true, closedAt: true, messages: { where: { senderId: agent.id }, orderBy: { createdAt: 'asc' }, take: 1, select: { createdAt: true } } } })
    const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length / 60000) : 0
    return { agent: { id: agent.id, username: agent.username, email: agent.email }, ticketsHandled: agent._count.ownedConversations, avgResponseTimeMinutes: average(conversations.map(c => c.messages[0] ? c.messages[0].createdAt.getTime() - c.createdAt.getTime() : 0).filter(Boolean)), avgResolutionTimeMinutes: average(conversations.map(c => c.closedAt!.getTime() - c.createdAt.getTime())), csat: null, aiAssistUsage: await prisma.aIAnalytics.count({ where: { companyId: req.companyId, metadata: { path: ['agentId'], equals: agent.id } } }) }
  }))
  res.json({ success: true, data })
})

router.post('/api-keys', ...secured, async (req, res) => { const b = z.object({ name: z.string().trim().min(1).max(80), scopes: z.array(z.string().min(1).max(80)).default([]), expiresAt: z.coerce.date().optional() }).parse(req.body); res.status(201).json({ success: true, data: await apiKeyService.createKey(req.companyId!, b.name, b.scopes, b.expiresAt) }) })
router.get('/api-keys', ...secured, async (req, res) => res.json({ success: true, data: await apiKeyService.listKeys(req.companyId!) }))
router.delete('/api-keys/:id', ...secured, async (req, res) => { const key = await prisma.companyApiKey.findFirst({ where: { id: String(req.params.id), companyId: req.companyId } }); if (!key) return res.status(404).json({ success: false, message: 'API key not found' }); await apiKeyService.revokeKey(key.id); await auditLogService.log(req.companyId, 'API_KEY_DELETED' as any, 'api_key', key.id, req.userId); res.status(204).send() })
router.post('/api-keys/:id/rotate', ...secured, async (req, res) => { const b = z.object({ name: z.string().trim().min(1).max(80), scopes: z.array(z.string().min(1).max(80)).default([]), expiresAt: z.coerce.date().optional() }).parse(req.body); res.status(201).json({ success: true, data: await apiKeyService.rotateKey(req.companyId!, String(req.params.id), b.name, b.scopes, b.expiresAt) }) })

router.post('/webhooks', ...secured, async (req, res) => { const b = z.object({ url: z.string().url(), events: z.array(z.enum(['CONVERSATION_CREATED', 'CONVERSATION_ASSIGNED', 'CONVERSATION_RESOLVED', 'MESSAGE_CREATED', 'AI_REPLY_GENERATED'])).min(1) }).parse(req.body); res.status(201).json({ success: true, data: await webhookService.create(req.companyId!, b.url, b.events) }) })
router.get('/webhooks', ...secured, async (req, res) => res.json({ success: true, data: await webhookService.getWebhooks(req.companyId!) }))
router.delete('/webhooks/:id', ...secured, async (req, res) => { const hook = await prisma.webhook.findFirst({ where: { id: String(req.params.id), companyId: req.companyId } }); if (!hook) return res.status(404).json({ success: false, message: 'Webhook not found' }); await webhookService.delete(hook.id, req.companyId!); res.status(204).send() })
router.post('/webhooks/deliveries/:id/replay', ...secured, async (req, res) => { const jobId = await webhookService.replayDelivery(req.companyId!, String(req.params.id)); if (!jobId) return res.status(503).json({ success: false, message: 'Redis queue is unavailable' }); res.status(202).json({ success: true, data: { jobId } }) })
export default router
