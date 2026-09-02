import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  conversation: vi.fn(),
  message: vi.fn(),
  document: vi.fn(),
  user: vi.fn(),
}))

vi.mock('../../src/config/prisma', () => ({ prisma: {
  conversation: { findFirst: mocks.conversation },
  message: { findFirst: mocks.message },
  knowledgeDocument: { findFirst: mocks.document },
  user: { findFirst: mocks.user },
} }))

import { assertConversationAccess, assertMessageAccess, assertKnowledgeAccess, assertUserAccess, TenantAccessError } from '../../src/security/tenant-access'

describe('tenant access helpers', () => {
  it('passes companyId into conversation access checks', async () => {
    mocks.conversation.mockResolvedValueOnce(null)
    await expect(assertConversationAccess('company-a', 'conversation-b')).rejects.toBeInstanceOf(TenantAccessError)
    expect(mocks.conversation).toHaveBeenCalledWith({ where: { id: 'conversation-b', companyId: 'company-a' } })
  })

  it('passes companyId into message, knowledge, and user checks', async () => {
    mocks.message.mockResolvedValueOnce({ id: 'm' })
    mocks.document.mockResolvedValueOnce({ id: 'd' })
    mocks.user.mockResolvedValueOnce({ id: 'u' })
    await expect(assertMessageAccess('company-a', 'm')).resolves.toEqual({ id: 'm' })
    await expect(assertKnowledgeAccess('company-a', 'd')).resolves.toEqual({ id: 'd' })
    await expect(assertUserAccess('company-a', 'u')).resolves.toEqual({ id: 'u' })
    expect(mocks.message).toHaveBeenCalledWith({ where: { id: 'm', companyId: 'company-a' } })
    expect(mocks.document).toHaveBeenCalledWith({ where: { id: 'd', companyId: 'company-a' } })
    expect(mocks.user).toHaveBeenCalledWith({ where: { id: 'u', companyId: 'company-a' } })
  })
})
