import { describe, it, expect } from 'vitest'
import { assistantService } from '../../src/modules/ai/assistant/assistant.service'

describe('AssistantService (mock provider)', () => {
  it('returns a mock answer when no company configured', async () => {
    const r = await assistantService.generateAnswer('', 'Hello, how do I reset my password?')
    expect(r.answer).toContain('Mock answer')
    expect(typeof r.confidence).toBe('number')
  })
})
