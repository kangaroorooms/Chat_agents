import { z } from 'zod'
import type { ToolRegistryInterface, AITool } from './tool.types'

class ToolRegistry implements ToolRegistryInterface {
  private tools: Map<string, AITool<any, any>> = new Map()

  register(tool: AITool<any, any>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`)
    }
    this.tools.set(tool.name, tool)
  }

  get(name: string): AITool<any, any> | undefined {
    return this.tools.get(name)
  }

  async execute<T>(name: string, input: unknown): Promise<T> {
    const tool = this.tools.get(name)
    if (!tool) throw new Error(`Tool not found: ${name}`)
    const parsed = tool.inputSchema.parse(input)
    return tool.execute(parsed) as Promise<T>
  }

  list() {
    const out: { name: string; description: string; inputSchema: string }[] = []
    for (const t of this.tools.values()) {
      out.push({ name: t.name, description: t.description, inputSchema: t.inputSchema.toString() })
    }
    return out
  }
}

export const toolRegistry = new ToolRegistry()

export default toolRegistry
