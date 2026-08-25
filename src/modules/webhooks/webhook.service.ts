import { prisma } from '../../../config/prisma'
import crypto from 'crypto'

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
  async delete(webhookId: string): Promise<any> {
    return (prisma as any).webhook.delete({ where: { id: webhookId } })
  }

  /**
   * Dispatch webhook with retry
   */
  async dispatch(webhookId: string, event: string, payload: any): Promise<void> {
    const webhook = await (prisma as any).webhook.findUnique({ where: { id: webhookId } })
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
          attempt: 1,
        },
      })

      if (!response.ok) {
        await this.scheduleRetry(webhookId, event, payload, 1)
      }
    } catch (error) {
      console.error('Webhook dispatch error:', error)
      await this.scheduleRetry(webhookId, event, payload, 1)
    }
  }

  /**
   * Schedule retry with exponential backoff
   */
  private async scheduleRetry(webhookId: string, event: string, payload: any, attempt: number): Promise<void> {
    if (attempt >= 3) return // Max 3 retries

    const backoffMinutes = Math.pow(2, attempt)
    const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000)

    await (prisma as any).webhookDelivery.create({
      data: {
        webhookId,
        event,
        payload,
        attempt: attempt + 1,
        nextRetryAt,
      },
    })
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
