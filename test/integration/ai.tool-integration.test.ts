import { describe, it, expect, vi } from 'vitest'
import { AIServiceImpl } from '../../src/modules/ai/ai.service'
import { makeMockOpenAIClient } from '../builders/openai.builder'

const mockToolAdapter = {
  handleToolCall: vi.fn(async () => [
    { toolName: 'searchKnowledge', result: [{ documentId: 'doc1', chunkId: 'chunk1', chunkSequence: 0, content: 'hello', score: 0.9 }] },
  ]),
}

describe('AIService integration', () => {
  it('invokes the LLM tool adapter and returns success', async () => {
    const openai = makeMockOpenAIClient()
    const service = new AIServiceImpl(openai as any, mockToolAdapter as any)
    const res = await service.invokeLLMTool('searchKnowledge', { query: 'reset', companyId: 'c1' })

    expect(res.success).toBe(true)
    expect(Array.isArray(res.results)).toBe(true)
    expect(mockToolAdapter.handleToolCall).toHaveBeenCalled()
  })
})
