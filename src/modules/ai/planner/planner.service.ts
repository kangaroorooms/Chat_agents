import { toolRegistry } from '../tools'
import type { AIPlanner, ToolPlan, ToolPlanStep, ToolExecutionResult } from './planner.types'
import { getKnowledgeConfig } from '../../knowledge/knowledge.config'

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

// Very small rule-based planner for initial implementation
export class AIPlannerImpl implements AIPlanner {
  private config = getKnowledgeConfig()

  async planForQuery(query: string, context?: { companyId?: string; conversationId?: string }) {
    // Simple heuristics:
    // - If query contains keywords like 'find', 'search', 'where', 'which', call searchKnowledge
    // - If query mentions 'summary' or 'summarize', call summarizeConversation
    // - If query mentions 'assign', 'transfer', call assign/transfer tools

    const q = query.toLowerCase()
    const steps: ToolPlanStep[] = []

    if (context?.companyId && /find|search|where|which|how do i|how to|what is/.test(q)) {
      steps.push({ id: generateId(), toolName: 'searchKnowledge', input: { query, companyId: context.companyId, topK: this.config.retrievalTopK } })
    }

    if (/summariz|summary|summarise/.test(q) && context?.conversationId) {
      steps.push({ id: generateId(), toolName: 'summarizeConversation', input: { conversationId: context.conversationId } })
    }

    if (/assign to|assign conversation|assign/.test(q) && context?.conversationId) {
      // owner must be supplied explicitly by LLM or UI; planner will not guess owner
      // we'll create a step placeholder; AIService may fill inputs via dialog
      steps.push({ id: generateId(), toolName: 'assignConversation', input: { conversationId: context.conversationId } })
    }

    if (steps.length === 0) return null

    const plan: ToolPlan = { id: generateId(), mode: 'sequential', steps }
    return plan
  }

  async executePlan(plan: ToolPlan) {
    const results: ToolExecutionResult[] = []

    if (plan.mode === 'sequential') {
      for (const step of plan.steps) {
        try {
          const res = await toolRegistry.execute(step.toolName, step.input)
          results.push({ stepId: step.id, toolName: step.toolName, result: res })
        } catch (err) {
          results.push({ stepId: step.id, toolName: step.toolName, result: { error: (err as Error).message } })
          // stop execution on error for now
          break
        }
      }
    } else {
      // parallel not yet implemented
      throw new Error('Parallel execution not implemented')
    }

    return results
  }
}

let aiPlannerInstance: AIPlannerImpl | null = null

export function getAIPlanner(): AIPlannerImpl {
  if (!aiPlannerInstance) aiPlannerInstance = new AIPlannerImpl()
  return aiPlannerInstance
}

export default AIPlannerImpl
