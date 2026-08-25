import { describe, it, expect } from 'vitest'
import { getAIPlanner } from '../../src/modules/ai/planner/planner.service'

describe('AIPlanner', () => {
  it('returns null plan for unrelated short text', async () => {
    const planner = getAIPlanner()
    const plan = await planner.planForQuery('hello there', {})
    expect(plan).toBeNull()
  })

  it('plans search for how-to query when companyId provided', async () => {
    const planner = getAIPlanner()
    const plan = await planner.planForQuery('How do I reset my password?', { companyId: 'c1' })
    expect(plan).not.toBeNull()
    expect(plan!.steps.length).toBeGreaterThan(0)
    expect(plan!.steps[0].toolName).toBe('searchKnowledge')
  })
})
