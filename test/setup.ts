import { vi } from 'vitest'

process.env.OPENAI_API_KEY ??= 'test-openai-key'
process.env.OPENAI_MODEL ??= 'gpt-4-turbo'

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: function () {
      return {
        chat: {
          completions: {
            create: async (opts: any) => {
              return {
                choices: [{ message: { content: 'mock response' } }],
                usage: { prompt_tokens: 1, completion_tokens: 1 },
              }
            },
          },
        },
      }
    },
    APIError: Error,
  }
})

// Mock prisma client used across modules
vi.mock('../src/config/prisma', () => {
  const data = {
    conversation: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: 'user1', username: 'tester', email: 't@test' }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    knowledgeDocument: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'doc1' }),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    knowledgeChunk: {
      create: vi.fn().mockResolvedValue({ id: 'chunk1' }),
      update: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({}),
    },
  }
  return { prisma: data }
})

// Mock embedding providers factory
vi.mock('../src/modules/knowledge/embeddings/openai.embedding', async () => {
  const mod = await vi.importActual('../src/modules/knowledge/embeddings/openai.embedding')
  return { createEmbeddingProvider: () => ({ embed: async (t: string) => Array(1536).fill(0.001), embedBatch: async (ts: string[]) => ts.map(() => Array(1536).fill(0.001)), OpenAIEmbeddingProvider: mod.OpenAIEmbeddingProvider }) }
})
