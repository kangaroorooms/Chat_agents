import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getOverview: vi.fn().mockResolvedValue({ ok: true }), audit: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../../src/modules/ai/analytics/analytics-api.service', () => ({ analyticsAPIService: { getOverview: mocks.getOverview } }))
vi.mock('../../src/modules/audit/audit.service', () => ({ auditLogService: { log: mocks.audit } }))

import { getAnalyticsOverview } from '../../src/modules/ai/analytics/analytics.controller'
import { requireApiKeyScope } from '../../src/middleware/api-key.middleware'

describe('tenant and API-key security', () => {
  it('uses authenticated company context rather than the URL company id', async () => {
    const req: any = { companyId: 'authenticated-company', params: { companyId: 'attacker-company' } }
    const res: any = { json: vi.fn(), status: vi.fn(() => res) }
    await getAnalyticsOverview(req, res)
    expect(mocks.getOverview).toHaveBeenCalledWith('authenticated-company')
    expect(mocks.getOverview).not.toHaveBeenCalledWith('attacker-company')
  })

  it('denies missing API-key scopes', () => {
    const req: any = { apiKey: true, apiKeyScopes: ['analytics:read'], companyId: 'company-1', path: '/webhooks', method: 'POST' }
    const json = vi.fn()
    const res: any = { status: vi.fn(() => ({ json })) }
    const next = vi.fn()
    requireApiKeyScope('webhooks:write')(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })
})