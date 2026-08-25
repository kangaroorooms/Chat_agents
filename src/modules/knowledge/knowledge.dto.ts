import { z } from 'zod'

export const CreateKnowledgeDocumentSchema = z.object({
  companyId: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  metadata: z.record(z.string(), z.any()).optional(),
  tags: z.array(z.string()).optional(),
  sourceType: z.enum(['DOCUMENT', 'FAQ', 'ARTICLE', 'MANUAL']).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'DRAFT']).optional(),
})

export const ListKnowledgeDocumentsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
})

export const SearchKnowledgeSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  companyId: z.string().uuid(),
  topK: z.coerce.number().min(1).default(5),
  threshold: z.coerce.number().min(0).max(1).default(0.5),
})
