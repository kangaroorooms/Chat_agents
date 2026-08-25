import { vi } from 'vitest'

export function makeMockOpenAIClient(overrides: Partial<any> = {}) {
  const stream = {
    async *[Symbol.asyncIterator]() {
      yield {
        choices: [{ delta: { content: 'mock chunk' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }
    },
  }

  return Object.assign(
    {
      chat: {
        completions: {
          create: vi.fn(async () => stream),
        },
      },
    },
    overrides
  )
}
