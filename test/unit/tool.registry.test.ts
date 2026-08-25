import { describe, it, expect } from 'vitest'
import { toolRegistry } from '../../src/modules/ai/tools'

describe('ToolRegistry', () => {
  it('lists registered tools', () => {
    const list = toolRegistry.list()
    expect(list).toBeInstanceOf(Array)
    // at least one tool registered earlier
    expect(list.length).toBeGreaterThan(0)
  })

  it('can execute a registered tool (searchKnowledge) with valid input', async () => {
    const res = await toolRegistry.execute('searchKnowledge', { query: 'test', companyId: 'c1' })
    expect(res).toBeInstanceOf(Array)
  })
})
