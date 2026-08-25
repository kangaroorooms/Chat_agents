import { describe, it, expect } from 'vitest'
import { getPromptBuilder } from '../../src/modules/knowledge/prompt/prompt-builder'

describe('PromptBuilder', () => {
  it('formats retrieved documents', () => {
    const pb = getPromptBuilder()
    const formatted = pb.formatRetrievedDocuments([
      { documentId: 'd1', chunkId: 'c1', chunkSequence: 0, content: 'hello', score: 0.9 },
    ])
    expect(formatted).toContain('Document 1')
  })
})
