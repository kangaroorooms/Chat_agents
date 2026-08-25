import { prisma } from '../../../config/prisma'

export class SLAService {
  /**
   * Create or update SLA policy
   */
  async setPolicy(companyId: string, firstResponseMinutes: number, resolutionMinutes: number): Promise<any> {
    return (prisma as any).sLAPolicy.upsert({
      where: { companyId },
      update: {
        firstResponseMinutes,
        resolutionMinutes,
      },
      create: {
        companyId,
        firstResponseMinutes,
        resolutionMinutes,
      },
    })
  }

  /**
   * Get SLA policy
   */
  async getPolicy(companyId: string): Promise<any> {
    return (prisma as any).sLAPolicy.findUnique({ where: { companyId } })
  }

  /**
   * Calculate due dates for conversation
   */
  async calculateDueDates(conversationId: string, companyId: string): Promise<any> {
    const policy = await this.getPolicy(companyId)
    if (!policy) return null

    const now = new Date()
    const firstResponseDueAt = new Date(now.getTime() + policy.firstResponseMinutes * 60 * 1000)
    const resolutionDueAt = new Date(now.getTime() + policy.resolutionMinutes * 60 * 1000)

    // Update conversation with due date
    await (prisma as any).conversation.update({
      where: { id: conversationId },
      data: { dueAt: resolutionDueAt },
    })

    return { firstResponseDueAt, resolutionDueAt }
  }

  /**
   * Check and mark SLA breaches
   */
  async checkBreaches(companyId: string): Promise<any> {
    const now = new Date()

    const breachedConversations = await (prisma as any).conversation.findMany({
      where: {
        companyId,
        dueAt: { lt: now },
        breachedAt: null,
        state: 'OPEN',
      },
    })

    // Mark as breached
    for (const conv of breachedConversations) {
      await (prisma as any).conversation.update({
        where: { id: conv.id },
        data: { breachedAt: now },
      })
    }

    return breachedConversations.length
  }

  /**
   * Get SLA metrics
   */
  async getMetrics(companyId: string): Promise<any> {
    const totalConversations = await (prisma as any).conversation.count({
      where: { companyId, state: 'CLOSED' },
    })

    const breachedCount = await (prisma as any).conversation.count({
      where: { companyId, breachedAt: { not: null } },
    })

    const conversationsWithDue = await (prisma as any).conversation.findMany({
      where: { companyId, state: 'CLOSED', dueAt: { not: null } },
      select: { createdAt: true, closedAt: true, dueAt: true },
    })

    const responseTimes: number[] = []
    conversationsWithDue.forEach((conv: any) => {
      if (conv.createdAt && conv.closedAt) {
        responseTimes.push(conv.closedAt.getTime() - conv.createdAt.getTime())
      }
    })

    const avgResponseTime = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0

    return {
      totalConversations,
      breachedCount,
      breachRate: totalConversations > 0 ? (breachedCount / totalConversations) * 100 : 0,
      avgResponseTime: Math.round(avgResponseTime / 1000 / 60), // minutes
      slaCompliance: totalConversations > 0 ? ((totalConversations - breachedCount) / totalConversations) * 100 : 100,
    }
  }
}

export const slaService = new SLAService()
