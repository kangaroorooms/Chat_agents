import { prisma } from '../../../config/prisma'

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
    return (prisma as any).subscriptionPlan.findUnique({ where: { planId } })
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
  async checkPlanLimits(companyId: string, resource: 'agents' | 'conversations' | 'documents'): Promise<boolean> {
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

    return false
  }

  /**
   * Check if AI is enabled for company
   */
  async isAIEnabled(companyId: string): Promise<boolean> {
    const subscription = await this.getCompanySubscription(companyId)
    return subscription?.plan?.aiEnabled ?? false
  }
}

export const billingService = new BillingService()
