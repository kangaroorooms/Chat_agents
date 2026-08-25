import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../../src/config/prisma'
import { MessageService } from '../../src/modules/messages/message.service'

const service = new MessageService()

describe('MessageService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when creating a message in a closed conversation', async () => {
    ;(prisma.conversation.findFirst as any).mockResolvedValue({ id: 'conv-1', state: 'CLOSED', isDeleted: false })

    await expect(service.createMessage('user-1', { conversationId: 'conv-1', content: 'hello' })).rejects.toThrow('Cannot add messages to closed or archived conversations')
    expect(prisma.conversation.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'conv-1' }) }))
  })

  it('includes sender metadata when creating a message', async () => {
    ;(prisma.conversation.findFirst as any).mockResolvedValue({ id: 'conv-1', state: 'OPEN', isDeleted: false })
    ;(prisma.conversationParticipant as any) = { findMany: vi.fn().mockResolvedValue([]) }
    ;(prisma.$transaction as any) = vi.fn(async (callback: any) => {
      return callback({
        message: {
          create: vi.fn().mockResolvedValue({ id: 'msg-1', content: 'hello', senderId: 'user-1', conversationId: 'conv-1', createdAt: new Date().toISOString(), sender: { id: 'user-1', username: 'tester', email: 't@test' } }),
        },
        messageReceipt: { createMany: vi.fn() },
        conversation: { update: vi.fn() },
      })
    })

    const result = await service.createMessage('user-1', { conversationId: 'conv-1', content: 'hello' })

    expect(result).toEqual(expect.objectContaining({ sender: expect.objectContaining({ id: 'user-1', username: 'tester' }) }))
  })

  it('throws when creating a message in an archived conversation', async () => {
    ;(prisma.conversation.findFirst as any).mockResolvedValue({ id: 'conv-2', state: 'ARCHIVED', isDeleted: false })

    await expect(service.createMessage('user-1', { conversationId: 'conv-2', content: 'hello' })).rejects.toThrow('Cannot add messages to closed or archived conversations')
  })
})
