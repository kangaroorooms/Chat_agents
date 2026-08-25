import { UsageMetricType, UsageAlertThreshold } from '@prisma/client'
import { prisma } from '../../config/prisma'

export type BillableMetric = 'conversations' | 'messages' | 'aiRequests' | 'aiTokens' | 'kbDocuments' | 'kbStorageBytes' | 'agents'
const types: Record<BillableMetric, UsageMetricType> = { conversations: 'CONVERSATIONS', messages: 'MESSAGES', aiRequests: 'AI_REQUESTS', aiTokens: 'AI_TOKENS', kbDocuments: 'KB_DOCUMENTS', kbStorageBytes: 'KB_STORAGE_BYTES', agents: 'AGENTS' }

export class UsageService {
  async record(companyId: string, metric: BillableMetric, quantity = 1, metadata?: Record<string, unknown>) {
    if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error('Usage quantity must be a non-negative integer')
    const timestamp = new Date()
    const row = await prisma.usageMetric.create({ data: { companyId, metricType: types[metric], quantity, timestamp, metadata: metadata as any } })
    await this.generateAlerts(companyId, types[metric], timestamp)
    return row
  }

  async summary(companyId: string) {
    const subscription = await prisma.companySubscription.findUnique({ where: { companyId }, include: { plan: true } })
    if (!subscription) throw new Error('Subscription not found')
    const rows = await prisma.usageMetric.groupBy({ by: ['metricType'], where: { companyId, timestamp: { gte: subscription.currentPeriodStart, lt: subscription.currentPeriodEnd } }, _sum: { quantity: true } })
    const used = Object.fromEntries(rows.map(row => [row.metricType, row._sum.quantity ?? 0]))
    const limits = { AGENTS: subscription.plan.maxAgents, CONVERSATIONS: subscription.plan.maxConversations, AI_REQUESTS: subscription.plan.maxAiRequests, KB_DOCUMENTS: subscription.plan.maxDocuments, MESSAGES: -1, AI_TOKENS: -1, KB_STORAGE_BYTES: -1 }
    return { periodStart: subscription.currentPeriodStart, periodEnd: subscription.currentPeriodEnd, metrics: Object.entries(limits).map(([metricType, limit]) => ({ metricType, quantity: used[metricType] ?? 0, limit, percentage: limit < 0 ? null : Math.min(100, Math.round(((used[metricType] ?? 0) / Math.max(limit, 1)) * 100)) })) }
  }

  async generateAlerts(companyId: string, metricType: UsageMetricType, timestamp: Date) {
    const subscription = await prisma.companySubscription.findUnique({ where: { companyId }, include: { plan: true } })
    if (!subscription) return
    const limits: Partial<Record<UsageMetricType, number>> = { AGENTS: subscription.plan.maxAgents, CONVERSATIONS: subscription.plan.maxConversations, AI_REQUESTS: subscription.plan.maxAiRequests, KB_DOCUMENTS: subscription.plan.maxDocuments }
    const limit = limits[metricType]
    if (!limit || limit < 0) return
    const aggregate = await prisma.usageMetric.aggregate({ where: { companyId, metricType, timestamp: { gte: subscription.currentPeriodStart, lt: subscription.currentPeriodEnd } }, _sum: { quantity: true } })
    const quantity = aggregate._sum.quantity ?? 0
    for (const [percentage, threshold] of [[80, 'EIGHTY'], [95, 'NINETY_FIVE'], [100, 'ONE_HUNDRED']] as const) {
      if (quantity >= Math.ceil(limit * percentage / 100)) await prisma.usageAlert.upsert({ where: { companyId_metricType_threshold_periodStart: { companyId, metricType, threshold: threshold as UsageAlertThreshold, periodStart: subscription.currentPeriodStart } }, update: { quantity, percentage }, create: { companyId, metricType, threshold: threshold as UsageAlertThreshold, percentage, limit, quantity, periodStart: subscription.currentPeriodStart } })
    }
  }

  async recordAiCost(companyId: string, input: { provider: string; model: string; inputTokens?: number; outputTokens?: number; totalTokens: number; estimatedCost: number }) {
    return prisma.$transaction(async tx => { const cost = await tx.aIUsageCost.create({ data: { companyId, ...input, inputTokens: input.inputTokens ?? 0, outputTokens: input.outputTokens ?? 0 } }); await tx.usageMetric.create({ data: { companyId, metricType: 'AI_REQUESTS', quantity: 1 } }); await tx.usageMetric.create({ data: { companyId, metricType: 'AI_TOKENS', quantity: input.totalTokens } }); return cost })
  }
}
export const usageService = new UsageService()
