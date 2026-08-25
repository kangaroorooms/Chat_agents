import { describe, it, expect } from 'vitest'
import { classifierService } from '../../src/modules/ai/classifier/classifier.service'

describe('ClassifierService', () => {
  it('classifies greeting', async () => {
    const r = await classifierService.classify('Hello there! I need help', undefined)
    expect(r.intent).toBe('greeting')
    expect(r.confidence).toBeGreaterThan(0)
  })

  it('classifies refund request', async () => {
    const r = await classifierService.classify('I want a refund for my order', undefined)
    expect(r.intent).toBe('refund_request')
  })
})
