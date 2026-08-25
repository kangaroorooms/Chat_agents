import { prisma } from '../../../config/prisma'

export class AnalyticsService {
  async record(event: { companyId: string; conversationId?: string; messageId?: string; eventType: string; confidence?: number; metadata?: any }) {
    try {
      await (prisma as any).aIAnalytics.create({ data: {
        companyId: event.companyId,
        conversationId: event.conversationId ?? null,
        messageId: event.messageId ?? null,
        eventType: event.eventType,
        confidence: event.confidence ?? null,
        metadata: event.metadata ?? null,
      } })
    } catch (err) {
      console.error('Analytics record error', err)
    }
  }

  async list(companyId: string, opts: { limit?: number } = {}) {
    const take = opts.limit || 100
    return (prisma as any).aIAnalytics.findMany({ where: { companyId }, take, orderBy: { createdAt: 'desc' } })
  }
}

export const analyticsService = new AnalyticsService()
