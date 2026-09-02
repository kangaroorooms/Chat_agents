import { prisma } from '../../config/prisma'
import crypto from 'crypto'
import { assertCompanyResourceOwnership } from '../../security/resource-ownership'
import { auditLogService } from '../audit/audit.service'
import { enqueue } from '../../infrastructure/queues'
import { webhookDeliveries } from '../../infrastructure/metrics'

export class WebhookService {
  /**
   * Create webhook
   */
  async create(companyId: string, url: string, events: string[]): Promise<any> {
    const secret = crypto.randomBytes(32).toString('hex')
    
    return (prisma as any).webhook.create({
      data: {
        companyId,
        url,
        secret,
        events,
        status: 'ACTIVE',
      },
    })
  }

  /**
   * Get webhooks
   */
  async getWebhooks(companyId: string): Promise<any[]> {
    return (prisma as any).webhook.findMany({ where: { companyId } })
  }

  /**
   * Delete webhook
   */
  async delete(webhookId: string, companyId: string): Promise<any> {
    await assertCompanyResourceOwnership(companyId, 'webhook', webhookId)
    return (prisma as any).webhook.delete({ where: { id: webhookId } })
  }

  /**
   * Dispatch webhook with retry
   */
  async dispatch(webhookId: string, event: string, payload: any, attempt = 0): Promise<void> {
    const webhook = await (prisma as any).webhook.findFirst({ where: { id: webhookId } })
    if (!webhook || webhook.status !== 'ACTIVE' || !webhook.events.includes(event)) {
      return
    }

    // Create delivery record
    const signature = this.generateSignature(payload, webhook.secret)
    
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
        },
        body: JSON.stringify(payload),
      })

      await (prisma as any).webhookDelivery.create({
        data: {
          webhookId,
          event,
          payload,
          statusCode: response.status,
          responseBody: await response.text(),
          attempt: attempt + 1,
        },
      })
      void auditLogService.log(webhook.companyId, response.ok ? 'WEBHOOK_DELIVERED' : 'WEBHOOK_FAILED', 'webhook', webhookId, undefined, { event, statusCode: response.status })
      webhookDeliveries.inc({ status: response.ok ? 'success' : 'failure' })

      if (!response.ok) throw new Error(`Webhook returned ${response.status}`)
    } catch (error) {
      console.error('Webhook dispatch error:', error)
      void auditLogService.log(webhook.companyId, 'WEBHOOK_FAILED', 'webhook', webhookId, undefined, { event, failed: true })
      webhookDeliveries.inc({ status: 'error' })
      throw error
    }
  }

  async enqueueDelivery(webhookId: string, event: string, payload: unknown): Promise<string | null> {
    return enqueue({ queue: 'webhook', name: 'deliver', data: { webhookId, event, payload } })
  }

  async replayDelivery(companyId: string, deliveryId: string): Promise<string | null> {
    const delivery = await (prisma as any).webhookDelivery.findFirst({ where: { id: deliveryId, webhook: { companyId } } })
    if (!delivery) throw new Error('Webhook delivery not found')
    return this.enqueueDelivery(delivery.webhookId, delivery.event, delivery.payload)
  }

  /**
   * Process pending retries
   */
  async processPendingRetries(): Promise<void> {
    const pendingDeliveries = await (prisma as any).webhookDelivery.findMany({
      where: {
        nextRetryAt: { lte: new Date() },
        statusCode: null,
      },
    })

    for (const delivery of pendingDeliveries) {
      await this.dispatch(delivery.webhookId, delivery.event, delivery.payload)
    }
  }

  /**
   * Generate HMAC signature
   */
  private generateSignature(payload: any, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex')
  }
}

export const webhookService = new WebhookService()
