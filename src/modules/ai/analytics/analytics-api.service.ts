import { prisma } from '../../../config/prisma'

export class AnalyticsAPIService {
  /**
   * Get overview analytics
   */
  async getOverview(companyId: string): Promise<any> {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get metrics from conversations
    const conversations = await (prisma as any).conversation.findMany({
      where: {
        companyId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        state: true,
        messages: {
          select: {
            id: true,
            senderId: true,
            type: true,
          },
        },
      },
    })

    const analytics = await (prisma as any).aIAnalytics.findMany({
      where: {
        companyId,
        createdAt: { gte: thirtyDaysAgo },
      },
    })

    // Calculate metrics
    const totalConversations = conversations.length
    const aiResolvedCount = analytics.filter((a: any) => a.eventType === 'AI_AUTO_REPLY').length
    const escalatedCount = analytics.filter((a: any) => a.eventType === 'AI_ESCALATION').length
    const humanResolvedCount = totalConversations - aiResolvedCount

    const avgConfidence =
      analytics.filter((a: any) => a.confidence).length > 0
        ? analytics
            .filter((a: any) => a.confidence)
            .reduce((sum: number, a: any) => sum + (a.confidence || 0), 0) /
          analytics.filter((a: any) => a.confidence).length
        : 0

    const escalationRate = totalConversations > 0 ? (escalatedCount / totalConversations) * 100 : 0

    // Calculate average response time from analytics metadata
    const responseTimings = analytics
      .filter((a: any) => a.metadata?.processingTime)
      .map((a: any) => a.metadata.processingTime)
    const avgResponseTime = responseTimings.length > 0 ? responseTimings.reduce((a: number, b: number) => a + b, 0) / responseTimings.length : 0

    return {
      period: {
        start: thirtyDaysAgo,
        end: now,
      },
      totalConversations,
      aiResolved: aiResolvedCount,
      humanResolved: humanResolvedCount,
      escalationRate: Math.round(escalationRate * 100) / 100,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      averageResponseTime: Math.round(avgResponseTime),
      metrics: {
        autoReplies: analytics.filter((a: any) => a.eventType === 'AI_AUTO_REPLY').length,
        escalations: escalatedCount,
        errors: analytics.filter((a: any) => a.eventType === 'AI_ERROR').length,
        responses: analytics.filter((a: any) => a.eventType === 'AI_RESPONSE').length,
      },
    }
  }

  /**
   * Get confidence distribution
   */
  async getConfidenceDistribution(companyId: string, days: number = 30): Promise<any> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const analytics = await (prisma as any).aIAnalytics.findMany({
      where: {
        companyId,
        createdAt: { gte: startDate },
        confidence: { not: null },
      },
      select: {
        confidence: true,
      },
    })

    // Bucket by confidence ranges
    const buckets = {
      '0-0.2': 0,
      '0.2-0.4': 0,
      '0.4-0.6': 0,
      '0.6-0.8': 0,
      '0.8-1.0': 0,
    }

    analytics.forEach((a: any) => {
      const conf = a.confidence || 0
      if (conf < 0.2) buckets['0-0.2']++
      else if (conf < 0.4) buckets['0.2-0.4']++
      else if (conf < 0.6) buckets['0.4-0.6']++
      else if (conf < 0.8) buckets['0.6-0.8']++
      else buckets['0.8-1.0']++
    })

    return buckets
  }

  /**
   * Get trends over time
   */
  async getTrends(companyId: string, days: number = 30): Promise<any[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const analytics = await (prisma as any).aIAnalytics.findMany({
      where: {
        companyId,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        eventType: true,
        confidence: true,
      },
    })

    // Group by day
    const dailyMetrics: Record<string, any> = {}

    analytics.forEach((a: any) => {
      const day = a.createdAt.toISOString().split('T')[0]
      if (!dailyMetrics[day]) {
        dailyMetrics[day] = {
          date: day,
          total: 0,
          autoReplies: 0,
          escalations: 0,
          errors: 0,
          totalConfidence: 0,
          confidenceCount: 0,
        }
      }
      dailyMetrics[day].total++
      if (a.eventType === 'AI_AUTO_REPLY') dailyMetrics[day].autoReplies++
      if (a.eventType === 'AI_ESCALATION') dailyMetrics[day].escalations++
      if (a.eventType === 'AI_ERROR') dailyMetrics[day].errors++
      if (a.confidence) {
        dailyMetrics[day].totalConfidence += a.confidence
        dailyMetrics[day].confidenceCount++
      }
    })

    // Convert to array and sort
    const trends = Object.values(dailyMetrics)
      .map((m: any) => ({
        date: m.date,
        total: m.total,
        autoReplies: m.autoReplies,
        escalations: m.escalations,
        errors: m.errors,
        avgConfidence: m.confidenceCount > 0 ? m.totalConfidence / m.confidenceCount : 0,
      }))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return trends
  }

  /**
   * Get event type distribution
   */
  async getEventTypeDistribution(companyId: string, days: number = 30): Promise<any> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const analytics = await (prisma as any).aIAnalytics.findMany({
      where: {
        companyId,
        createdAt: { gte: startDate },
      },
      select: {
        eventType: true,
      },
    })

    const distribution: Record<string, number> = {}
    analytics.forEach((a: any) => {
      distribution[a.eventType] = (distribution[a.eventType] || 0) + 1
    })

    return distribution
  }

  /**
   * Get intent distribution
   */
  async getIntentDistribution(companyId: string, days: number = 30): Promise<any> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const analytics = await (prisma as any).aIAnalytics.findMany({
      where: {
        companyId,
        createdAt: { gte: startDate },
      },
      select: {
        metadata: true,
      },
    })

    const distribution: Record<string, number> = {}
    analytics.forEach((a: any) => {
      if (a.metadata?.intent) {
        const intent = a.metadata.intent
        distribution[intent] = (distribution[intent] || 0) + 1
      }
    })

    return distribution
  }
}

export const analyticsAPIService = new AnalyticsAPIService()
