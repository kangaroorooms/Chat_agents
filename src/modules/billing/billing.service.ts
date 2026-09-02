import { prisma } from '../../config/prisma'

export type PlanResource = 'agents' | 'conversations' | 'documents' | 'aiRequests'

export class BillingService {
  /**
   * Get all subscription plans
   */
  async getPlans(): Promise<any[]> {
    return (prisma as any).subscriptionPlan.findMany()
  }

  /**
   * Get plan by ID
   */
  async getPlanById(planId: string): Promise<any> {
    return (prisma as any).subscriptionPlan.findUnique({ where: { id: planId } })
  }

  /**
   * Get company subscription
   */
  async getCompanySubscription(companyId: string): Promise<any> {
    return (prisma as any).companySubscription.findUnique({
      where: { companyId },
      include: { plan: true },
    })
  }

  /**
   * Create or update company subscription
   */
  async setCompanySubscription(
    companyId: string,
    planId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<any> {
    return (prisma as any).companySubscription.upsert({
      where: { companyId },
      update: {
        planId,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
      create: {
        companyId,
        planId,
        status: 'ACTIVE',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
      include: { plan: true },
    })
  }

  /**
   * Check if company can perform action based on plan
   */
  async checkPlanLimits(companyId: string, resource: PlanResource): Promise<boolean> {
    const subscription = await this.getCompanySubscription(companyId)
    if (!subscription || !subscription.plan) return false

    const plan = subscription.plan

    if (resource === 'agents') {
      const agentCount = await (prisma as any).user.count({
        where: { companyId, role: 'AGENT' },
      })
      return agentCount < plan.maxAgents
    }

    if (resource === 'conversations') {
      const conversationCount = await (prisma as any).conversation.count({
        where: { companyId },
      })
      return conversationCount < plan.maxConversations
    }

    if (resource === 'documents') {
      const docCount = await (prisma as any).knowledgeDocument.count({
        where: { companyId },
      })
      return docCount < plan.maxDocuments
    }

    if (resource === 'aiRequests') {
      const used = await (prisma as any).usageMetric.aggregate({ where: { companyId, metricType: 'AI_REQUESTS', timestamp: { gte: subscription.currentPeriodStart, lt: subscription.currentPeriodEnd } }, _sum: { quantity: true } })
      return (used._sum.quantity ?? 0) < plan.maxAiRequests
    }

    return false
  }

  async ensureDefaultPlans(): Promise<void> {
    const plans = [
      { name: 'FREE', monthlyPrice: 0, maxAgents: 2, maxConversations: 100, maxDocuments: 10, maxAiRequests: 100, aiEnabled: true },
      { name: 'STARTER', monthlyPrice: 2900, maxAgents: 10, maxConversations: 1000, maxDocuments: 100, maxAiRequests: 1000, aiEnabled: true },
      { name: 'PRO', monthlyPrice: 9900, maxAgents: 50, maxConversations: 10000, maxDocuments: 1000, maxAiRequests: 10000, aiEnabled: true },
      { name: 'ENTERPRISE', monthlyPrice: 0, maxAgents: -1, maxConversations: -1, maxDocuments: -1, maxAiRequests: -1, aiEnabled: true },
    ]
    for (const plan of plans) await (prisma as any).subscriptionPlan.upsert({ where: { name: plan.name }, update: plan, create: plan })
  }

  /**
   * Check if AI is enabled for company
   */
  async isAIEnabled(companyId: string): Promise<boolean> {
    const subscription = await this.getCompanySubscription(companyId)
    return subscription?.plan?.aiEnabled ?? false
  }

  async getLimits(companyId: string): Promise<Record<string, number>> {
    const subscription = await this.getCompanySubscription(companyId)
    if (!subscription?.plan) return {}
    return { agents: subscription.plan.maxAgents, conversations: subscription.plan.maxConversations, documents: subscription.plan.maxDocuments, aiRequests: subscription.plan.maxAiRequests }
  }
}

export const billingService = new BillingService()
