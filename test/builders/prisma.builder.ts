import { vi } from 'vitest'

export function mockPrisma(overrides: any = {}) {
  const base = {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    conversation: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
    },
  }
  return Object.assign(base, overrides)
}
