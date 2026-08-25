import { describe, it, expect, vi } from 'vitest'

vi.mock('../../src/modules/ai/ai.memory', async () => {
  const actual = await vi.importActual('../../src/modules/ai/ai.memory')
  return {
    ...actual,
    buildConversationContext: vi.fn(async () => ({
      conversationId: 'conv-1',
      customerId: 'cust-1',
      agentId: 'agent-1',
      messages: [
        {
          id: 'msg-1',
          createdAt: new Date(),
          type: 'text',
          isDeleted: false,
          deletedAt: null,
          metadata: null,
          conversationId: 'conv-1',
          content: 'hello',
          replyToId: null,
          senderId: 'user-1',
          editedAt: null,
        },
      ],
      metadata: {},
      recentMessageCount: 1,
    })),
    truncateContextWindow: vi.fn((messages: any[]) => messages),
    buildSystemPrompt: vi.fn(() => 'system prompt'),
    formatMessagesForAPI: vi.fn((messages: any[]) => messages.map((msg) => ({ role: 'user', content: msg.content }))),
  }
})

import { AIServiceImpl } from '../../src/modules/ai/ai.service'
import { makeMockOpenAIClient } from '../builders/openai.builder'

const mockToolAdapter = {
  handleToolCall: vi.fn(async () => [{ toolName: 'searchKnowledge', result: [] }]),
}

describe('AIService', () => {
  it('uses injected OpenAI client for streaming', async () => {
    const openai = makeMockOpenAIClient()
    const service = new AIServiceImpl(openai as any, mockToolAdapter as any)
    const iterator = service.generateResponseStream('conv-1', 'hello', 'company-1')
    const first = await iterator.next()
    expect(first.value).toBe('mock chunk')
    expect(first.done).toBe(false)
  })

  it('can invoke LLM tool through injected adapter', async () => {
    const openai = makeMockOpenAIClient()
    const service = new AIServiceImpl(openai as any, mockToolAdapter as any)
    const res = await service.invokeLLMTool('searchKnowledge', { query: 'reset', companyId: 'c1' })
    expect(res.success).toBe(true)
    expect(mockToolAdapter.handleToolCall).toHaveBeenCalledWith('searchKnowledge', { query: 'reset', companyId: 'c1' })
  })
})
