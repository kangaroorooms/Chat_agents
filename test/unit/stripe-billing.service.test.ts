import crypto from 'crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { StripeBillingService } from '../../src/modules/billing/stripe.service'

describe('StripeBillingService signature verification', () => {
  const previous = process.env.STRIPE_WEBHOOK_SECRET
  afterEach(() => { process.env.STRIPE_WEBHOOK_SECRET = previous })

  it('accepts a current Stripe-compatible HMAC signature', () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    const timestamp = Math.floor(Date.now() / 1000)
    const raw = Buffer.from('{"id":"evt_1"}')
    const signature = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${raw.toString('utf8')}`).digest('hex')
    expect(new StripeBillingService().verifySignature(raw, `t=${timestamp},v1=${signature}`)).toBe(true)
  })

  it('rejects invalid signatures', () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    expect(new StripeBillingService().verifySignature(Buffer.from('{}'), 't=1,v1=invalid')).toBe(false)
  })
})
