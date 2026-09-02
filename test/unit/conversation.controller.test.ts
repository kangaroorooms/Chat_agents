import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAgentQueue } from '../../src/modules/conversations/conversation.controller'
import { conversationService } from '../../src/modules/conversations/conversation.service'

const listAgentQueueSpy = vi.spyOn(conversationService, 'listAgentQueue')

describe('ConversationController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns agent queue for AGENT users', async () => {
    const req: any = { query: {}, userId: 'agent-1', companyId: 'company-1', user: { role: 'AGENT', companyId: 'company-1' } }
    const json = vi.fn()
    const status = vi.fn(() => ({ json }))
    const res: any = { status }
    listAgentQueueSpy.mockResolvedValue({ items: [{ id: 'conv-1' }], pagination: { nextCursor: null } } as any)

    await getAgentQueue(req, res)

    expect(status).toHaveBeenCalledWith(200)
    expect(json).toHaveBeenCalledWith({ success: true, message: 'OK', data: [{ id: 'conv-1' }], pagination: { nextCursor: null } })
    expect(listAgentQueueSpy).toHaveBeenCalledWith('agent-1', expect.objectContaining({ companyId: 'company-1' }))
  })

  it('returns 400 when query validation fails', async () => {
    const req: any = { query: { limit: 'not-a-number' }, userId: 'agent-1', user: { role: 'AGENT' } }
    const json = vi.fn()
    const status = vi.fn(() => ({ json }))
    const res: any = { status }

    await getAgentQueue(req, res)

    expect(status).toHaveBeenCalledWith(400)
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }))
  })
})
