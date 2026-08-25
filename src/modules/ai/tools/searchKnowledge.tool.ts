import { z } from 'zod'
import type { AITool } from './tool.types'
import { getKnowledgeService } from '../../knowledge'

const schema = z.object({
  query: z.string(),
  companyId: z.string(),
  topK: z.number().optional(),
  threshold: z.number().optional(),
})

export const SearchKnowledgeTool: AITool<z.infer<typeof schema>, any[]> = {
  name: 'searchKnowledge',
  description: 'Search the company knowledge base for relevant documents',
  inputSchema: schema,
  async execute(input) {
    const ks = getKnowledgeService()
    return ks.retrieveDocuments({ query: input.query, companyId: input.companyId, topK: input.topK, threshold: input.threshold })
  },
}
