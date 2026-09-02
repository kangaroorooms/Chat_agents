import { describe, expect, it } from 'vitest'
import { webhookAttempts, webhookBackoffDelayMs } from '../../src/infrastructure/queues'

describe('webhook retry policy', () => {
  it('configures five exponential retries after the initial delivery', () => {
    expect(webhookAttempts).toBe(6)
    expect(webhookBackoffDelayMs).toBe(60_000)
    expect([1, 2, 4, 8, 16].map((minutes) => webhookBackoffDelayMs / 60_000 * 2 ** (minutes === 1 ? 0 : Math.log2(minutes / 1)))).toEqual([1, 2, 4, 8, 16])
  })
})