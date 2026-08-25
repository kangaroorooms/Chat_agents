import { z } from 'zod'

export type ToolExecuteResult = unknown

export interface AITool<I = unknown, O = ToolExecuteResult> {
  name: string
  description: string
  inputSchema: z.ZodType<I>
  execute(input: I): Promise<O>
}

export interface ToolRegistryInterface {
  register(tool: AITool<any, any>): void
  get(name: string): AITool<any, any> | undefined
  execute<T>(name: string, input: unknown): Promise<T>
  list(): { name: string; description: string; inputSchema: string }[]
}

export default ToolExecuteResult
