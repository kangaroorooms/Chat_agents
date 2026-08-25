import { describe, it, expect } from 'vitest'
import { sentimentService } from '../../src/modules/ai/sentiment/sentiment.service'

describe('SentimentService', () => {
  it('detects positive sentiment', () => {
    const r = sentimentService.analyze('Thanks, that was great!')
    expect(r.label).toBe('positive')
    expect(r.score).toBeGreaterThan(0)
  })

  it('detects negative sentiment', () => {
    const r = sentimentService.analyze('I am very unhappy and frustrated')
    expect(r.label).toBe('negative')
  })
})
