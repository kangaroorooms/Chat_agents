import { describe, it, expect } from 'vitest'
import { llmToolAdapter } from '../../src/modules/ai/tools/llm.adapter'

describe('LLMToolAdapter', () => {
  it('lists tools and includes searchKnowledge', () => {
    const defs = llmToolAdapter.listTools()
    expect(defs.some((d) => d.name === 'searchKnowledge')).toBe(true)
  })

  it('handles a simple tool call', async () => {
    const results = await llmToolAdapter.handleToolCall('searchKnowledge', { query: 'reset', companyId: 'c1' })
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBeGreaterThanOrEqual(0)
  })
})
