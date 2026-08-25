import type { RetrievalQuery, RetrievedDocument } from '../../knowledge/knowledge.types'

export type ToolPlanStep = {
  id: string
  toolName: string
  input: unknown
}

export type ToolPlan = {
  id: string
  mode: 'sequential' | 'parallel'
  steps: ToolPlanStep[]
}

export type ToolExecutionResult = {
  stepId: string
  toolName: string
  result: unknown
}

export interface AIPlanner {
  planForQuery(query: string, context?: { companyId?: string; conversationId?: string }): Promise<ToolPlan | null>
  executePlan(plan: ToolPlan): Promise<ToolExecutionResult[]>
}
