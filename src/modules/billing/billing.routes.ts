import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../../middleware/auth.middleware'
import { requireCompanyContext } from '../../middleware/company.middleware'
import { requireRole } from '../../middleware/authorize.middleware'
import { prisma } from '../../config/prisma'
import { billingService } from './billing.service'
import { stripeBillingService } from './stripe.service'
import { usageService } from './usage.service'

const router = Router()
const secured = [authMiddleware, requireCompanyContext, requireRole(['ADMIN', 'SUPER_ADMIN'])]
router.post('/checkout-session', ...secured, async (req, res) => { try { const body = z.object({ planId: z.string().uuid(), successUrl: z.string().url(), cancelUrl: z.string().url() }).parse(req.body); const session = await stripeBillingService.checkout(req.companyId!, body.planId, body.successUrl, body.cancelUrl); res.status(201).json({ success: true, data: { id: session.id, url: session.url } }) } catch (error) { res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Checkout session failed' }) } })
router.post('/customer-portal', ...secured, async (req, res) => { try { const { returnUrl } = z.object({ returnUrl: z.string().url() }).parse(req.body); const session = await stripeBillingService.portal(req.companyId!, returnUrl); res.json({ success: true, data: { url: session.url } }) } catch (error) { res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Customer portal failed' }) } })
router.post('/webhooks', async (req, res) => { const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(''); if (!stripeBillingService.verifySignature(raw, req.header('stripe-signature'))) return res.status(400).json({ success: false, message: 'Invalid Stripe signature' }); try { await stripeBillingService.processEvent(JSON.parse(raw.toString('utf8'))); res.status(200).json({ received: true }) } catch { res.status(500).json({ received: false }) } })
router.get('/overview', ...secured, async (req, res) => { const [subscription, usage, invoices, costs] = await Promise.all([billingService.getCompanySubscription(req.companyId!), usageService.summary(req.companyId!), prisma.billingInvoice.findMany({ where: { companyId: req.companyId }, orderBy: { createdAt: 'desc' }, take: 5 }), prisma.aIUsageCost.aggregate({ where: { companyId: req.companyId, createdAt: { gte: (await billingService.getCompanySubscription(req.companyId!))?.currentPeriodStart } }, _sum: { estimatedCost: true } })]); res.json({ success: true, data: { subscription, usage, recentInvoices: invoices, aiEstimatedCost: costs._sum.estimatedCost ?? 0 } }) })
router.get('/usage', ...secured, async (req, res) => res.json({ success: true, data: await usageService.summary(req.companyId!) }))
router.get('/invoices', ...secured, async (req, res) => res.json({ success: true, data: await prisma.billingInvoice.findMany({ where: { companyId: req.companyId }, orderBy: { createdAt: 'desc' } }) }))
router.get('/subscription', ...secured, async (req, res) => res.json({ success: true, data: { subscription: await billingService.getCompanySubscription(req.companyId!), stripe: await prisma.billingSubscription.findUnique({ where: { companyId: req.companyId } }) } }))
router.get('/limits', ...secured, async (req, res) => res.json({ success: true, data: await billingService.getLimits(req.companyId!) }))
export default router
