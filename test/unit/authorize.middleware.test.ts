import { describe, it, expect, vi } from 'vitest'
import { requireRole } from '../../src/middleware/authorize.middleware'

describe('authorize.middleware', () => {
  it('denies access for CUSTOMER when AGENT roles are required', () => {
    const req: any = { user: { role: 'CUSTOMER' } }
    const json = vi.fn()
    const status = vi.fn(() => ({ json }))
    const next = vi.fn()

    const middleware = requireRole(['AGENT', 'ADMIN', 'SUPER_ADMIN'])
    middleware(req, { status } as any, next as any)

    expect(status).toHaveBeenCalledWith(403)
    expect(json).toHaveBeenCalledWith({ message: 'Forbidden' })
    expect(next).not.toHaveBeenCalled()
  })

  it('allows access for AGENT when required', () => {
    const req: any = { user: { role: 'AGENT' } }
    const json = vi.fn()
    const status = vi.fn(() => ({ json }))
    const next = vi.fn()

    const middleware = requireRole(['AGENT', 'ADMIN', 'SUPER_ADMIN'])
    middleware(req, { status } as any, next as any)

    expect(next).toHaveBeenCalled()
    expect(status).not.toHaveBeenCalled()
    expect(json).not.toHaveBeenCalled()
  })
})
