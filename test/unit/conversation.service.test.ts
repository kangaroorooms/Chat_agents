import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../../src/config/prisma'
import { ConversationService } from '../../src/modules/conversations/conversation.service'

const service = new ConversationService()

describe('ConversationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds the agent queue query and returns matching conversations', async () => {
    const mockItems = [{ id: 'conv-1', title: 'Support request', ownerId: null, state: 'OPEN', queueState: 'NEW' }]
    ;(prisma.conversation.findMany as any).mockResolvedValue(mockItems)
    ;(prisma.conversation.count as any).mockResolvedValue(1)

    const result = await service.listAgentQueue('agent-1', { limit: 20 })

    expect(prisma.conversation.findMany).toHaveBeenCalled()
    expect(result.items).toEqual(mockItems)
    expect(result.pagination).toEqual({ nextCursor: null, pageSize: 20, total: 1 })
  })

  it('applies search filters to the agent queue query', async () => {
    const mockItems = [{ id: 'conv-2', title: 'Billing issue', ownerId: 'agent-1', state: 'OPEN', queueState: 'ASSIGNED' }]
    ;(prisma.conversation.findMany as any).mockResolvedValue(mockItems)
    ;(prisma.conversation.count as any).mockResolvedValue(1)

    await service.listAgentQueue('agent-1', { search: 'billing' })

    const findArgs = (prisma.conversation.findMany as any).mock.calls[0][0]
    expect(findArgs.where.AND).toBeDefined()
    expect(findArgs.where.AND.some((entry: any) => entry.OR && entry.OR.some((cond: any) => Boolean(cond.title?.contains)))).toBe(true)
  })
})
