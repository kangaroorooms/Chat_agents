import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockEmit = vi.fn()
const mockTo = vi.fn(() => ({ emit: mockEmit }))

vi.mock('../../src/modules/socket/socket.server', () => ({
  getIo: vi.fn(() => ({ to: mockTo })),
}))

describe('Socket subscriber', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockEmit.mockClear()
    mockTo.mockClear()
    const { default: socketSubscriber } = await import('../../src/modules/events/subscribers/socket-subscriber')
    socketSubscriber.init()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('broadcasts conversation workflow updates to company and user queue rooms', async () => {
    const { domainEventBus } = await import('../../src/modules/events/domain-event-bus')
    const { SocketEvents } = await import('../../src/modules/socket/eventRegistry')

    const payload = {
      conversationId: 'conv-1',
      performedById: 'user-1',
      ownerId: 'agent-2',
      queueState: 'TRANSFERRED',
      conversation: {
        id: 'conv-1',
        ownerId: 'agent-2',
        queueState: 'TRANSFERRED',
        companyId: 'company-1',
      },
    }

    domainEventBus.emit('conversation.transferred', payload as any)

    expect(mockTo).toHaveBeenCalledTimes(3)
    expect(mockTo).toHaveBeenNthCalledWith(1, 'conversation:conv-1')
    expect(mockEmit).toHaveBeenNthCalledWith(1, SocketEvents.CONVERSATION_TRANSFERRED, payload)
    expect(mockTo).toHaveBeenNthCalledWith(2, 'company:company-1')
    expect(mockEmit).toHaveBeenNthCalledWith(2, SocketEvents.CONVERSATION_UPDATED, {
      conversationId: 'conv-1',
      ownerId: 'agent-2',
      queueState: 'TRANSFERRED',
    })
    expect(mockTo).toHaveBeenNthCalledWith(3, 'user:agent-2')
    expect(mockEmit).toHaveBeenNthCalledWith(3, SocketEvents.CONVERSATION_UPDATED, {
      conversationId: 'conv-1',
      ownerId: 'agent-2',
      queueState: 'TRANSFERRED',
    })
  })
})
