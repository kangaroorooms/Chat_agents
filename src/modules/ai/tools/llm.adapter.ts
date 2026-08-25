import { toolRegistry } from './tool.registry'
import type { ToolRegistryInterface } from './tool.types'
import { getAIPlanner } from '../planner/planner.service'

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export interface LLMToolDefinition {
  name: string
  description: string
  // provider-neutral param description (stringified schema)
  parameters: string
}

export class LLMToolAdapter {
  private registry: ToolRegistryInterface

  constructor(registry: ToolRegistryInterface = toolRegistry) {
    this.registry = registry
  }

  listTools(): LLMToolDefinition[] {
    return this.registry.list().map((t) => ({ name: t.name, description: t.description, parameters: t.inputSchema }))
  }

  /**
   * Convert a tool call (from an LLM) into a planner-executable plan and run it.
   * Returns the structured execution results.
   */
  async handleToolCall(toolName: string, rawInput: unknown) {
    const tool = this.registry.get(toolName)
    if (!tool) throw new Error(`Tool not found: ${toolName}`)

    // Validate input using the tool's schema
    const parsed = await tool.inputSchema.parseAsync(rawInput)

    // Build a single-step plan and let the planner handle execution sequencing
    const planner = getAIPlanner()
    const plan = {
      id: generateId(),
      mode: 'sequential' as const,
      steps: [
        {
          id: generateId(),
          toolName,
          input: parsed,
        },
      ],
    }

    const results = await planner.executePlan(plan as any)
    return results
  }
}

export const llmToolAdapter = new LLMToolAdapter()

export default LLMToolAdapter
