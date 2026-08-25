import crypto from 'crypto'
import { prisma } from '../../config/prisma'

type StripeEvent = { id: string; type: string; data: { object: any } }
const stripeBase = 'https://api.stripe.com/v1'
export class StripeBillingService {
  private key() { const key = process.env.STRIPE_SECRET_KEY; if (!key) throw new Error('Stripe is not configured'); return key }
  private async request(path: string, params: Record<string, string>) { const response = await fetch(`${stripeBase}${path}`, { method: 'POST', headers: { authorization: `Bearer ${this.key()}`, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) }); if (!response.ok) throw new Error(`Stripe request failed (${response.status})`); return response.json() as Promise<any> }
  async customer(companyId: string) {
    const existing = await prisma.billingCustomer.findUnique({ where: { companyId } }); if (existing) return existing
    const company = await prisma.company.findUnique({ where: { id: companyId } }); if (!company) throw new Error('Company not found')
    const created = await this.request('/customers', { name: company.name, 'metadata[companyId]': companyId })
    return prisma.billingCustomer.create({ data: { companyId, stripeCustomerId: created.id } })
  }
  async checkout(companyId: string, planId: string, successUrl: string, cancelUrl: string) {
    const [customer, plan] = await Promise.all([this.customer(companyId), prisma.subscriptionPlan.findUnique({ where: { id: planId } })]); if (!plan?.stripePriceId) throw new Error('Plan is not configured for Stripe')
    return this.request('/checkout/sessions', { mode: 'subscription', customer: customer.stripeCustomerId, success_url: successUrl, cancel_url: cancelUrl, 'line_items[0][price]': plan.stripePriceId, 'line_items[0][quantity]': '1', 'metadata[companyId]': companyId, 'metadata[planId]': planId })
  }
  async portal(companyId: string, returnUrl: string) { const customer = await this.customer(companyId); return this.request('/billing_portal/sessions', { customer: customer.stripeCustomerId, return_url: returnUrl }) }
  verifySignature(raw: Buffer, header?: string) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET; if (!secret || !header) return false
    const parts = Object.fromEntries(header.split(',').map(part => { const [key, value] = part.split('='); return [key, value] })); const timestamp = parts.t; const signature = parts.v1
    if (!timestamp || !signature || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false
    const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${raw.toString('utf8')}`).digest('hex')
    return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  }
  async processEvent(event: StripeEvent) {
    const object = event.data.object; const customerId = object.customer as string | undefined; const customer = customerId ? await prisma.billingCustomer.findUnique({ where: { stripeCustomerId: customerId } }) : null
    const stored = await prisma.billingEvent.upsert({ where: { stripeEventId: event.id }, update: {}, create: { stripeEventId: event.id, type: event.type, companyId: customer?.companyId, payload: event as any } }); if (stored.processedAt) return
    try { if (customer) await this.applyEvent(customer.companyId, event); await prisma.billingEvent.update({ where: { id: stored.id }, data: { processedAt: new Date() } }) } catch (error) { await prisma.billingEvent.update({ where: { id: stored.id }, data: { failedAt: new Date(), failureReason: error instanceof Error ? error.message : 'Processing failed' } }); throw error }
  }
  private async applyEvent(companyId: string, event: StripeEvent) {
    const object = event.data.object
    if (event.type.startsWith('customer.subscription.')) { const status = ({ active: 'ACTIVE', trialing: 'TRIALING', past_due: 'PAST_DUE', canceled: 'CANCELED', unpaid: 'UNPAID', incomplete: 'INCOMPLETE' } as Record<string, any>)[object.status] ?? 'INCOMPLETE'; const priceId = object.items?.data?.[0]?.price?.id; await prisma.billingSubscription.upsert({ where: { companyId }, update: { stripeSubscriptionId: object.id, stripePriceId: priceId, status, currentPeriodStart: new Date(object.current_period_start * 1000), currentPeriodEnd: new Date(object.current_period_end * 1000), cancelAtPeriodEnd: Boolean(object.cancel_at_period_end) }, create: { companyId, stripeSubscriptionId: object.id, stripePriceId: priceId, status, currentPeriodStart: new Date(object.current_period_start * 1000), currentPeriodEnd: new Date(object.current_period_end * 1000), cancelAtPeriodEnd: Boolean(object.cancel_at_period_end) } }) }
    if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') { const status = event.type === 'invoice.paid' ? 'PAID' : 'FAILED'; await prisma.billingInvoice.upsert({ where: { stripeInvoiceId: object.id }, update: { status, amountDue: object.amount_due ?? 0, amountPaid: object.amount_paid ?? 0, paidAt: object.status_transitions?.paid_at ? new Date(object.status_transitions.paid_at * 1000) : null }, create: { companyId, stripeInvoiceId: object.id, stripeCustomerId: object.customer, status, amountDue: object.amount_due ?? 0, amountPaid: object.amount_paid ?? 0, currency: object.currency ?? 'usd', hostedInvoiceUrl: object.hosted_invoice_url, invoicePdf: object.invoice_pdf, periodStart: object.period_start ? new Date(object.period_start * 1000) : null, periodEnd: object.period_end ? new Date(object.period_end * 1000) : null, paidAt: object.status_transitions?.paid_at ? new Date(object.status_transitions.paid_at * 1000) : null } }) }
  }
}
export const stripeBillingService = new StripeBillingService()
