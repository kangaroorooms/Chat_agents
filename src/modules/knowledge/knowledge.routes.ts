import { Router, Request, Response } from 'express'
import { prisma } from '../../config/prisma'
import { authMiddleware } from '../../middleware/auth.middleware'
import { requireCompanyContext } from '../../middleware/company.middleware'
import { requireRole } from '../../middleware/authorize.middleware'
import { getKnowledgeService } from './knowledge.service'
import {
  CreateKnowledgeDocumentSchema,
  ListKnowledgeDocumentsQuerySchema,
  SearchKnowledgeSchema,
} from './knowledge.dto'
import { auditLogService } from '../audit/audit.service'
import { billingService } from '../billing/billing.service'
import { usageService } from '../billing/usage.service'

const router = Router()
const knowledgeService = getKnowledgeService()
const adminOnly = requireRole(['ADMIN', 'SUPER_ADMIN'])
router.use(authMiddleware, requireCompanyContext)

/**
 * POST /api/knowledge/documents
 * Add a new document to the knowledge base
 */
router.post('/documents', adminOnly, async (req: Request, res: Response) => {
  try {
    const parsed = CreateKnowledgeDocumentSchema.parse(req.body)
    if (parsed.companyId !== req.companyId) return res.status(403).json({ error: 'Company access denied' })

    const company = await prisma.company.findFirst({
      where: { id: parsed.companyId },
    })

    if (!company) {
      return res.status(404).json({ error: 'Company not found' })
    }
    if (!(await billingService.checkPlanLimits(parsed.companyId, 'documents'))) return res.status(402).json({ error: 'Document limit reached for this subscription' })

    const result = await knowledgeService.addDocument({
      companyId: parsed.companyId,
      title: parsed.title,
      content: parsed.content,
      metadata: parsed.metadata,
      tags: parsed.tags,
      sourceType: parsed.sourceType,
      status: parsed.status,
      createdBy: req.user?.userId,
      updatedBy: req.user?.userId,
    })
    await auditLogService.log(parsed.companyId, 'KB_UPLOADED', 'knowledge_document', result.documentId, req.userId)
    void usageService.record(parsed.companyId, 'kbDocuments', 1, { documentId: result.documentId }).catch(() => undefined)
    void usageService.record(parsed.companyId, 'kbStorageBytes', Buffer.byteLength(parsed.content, 'utf8'), { documentId: result.documentId }).catch(() => undefined)

    return res.status(201).json({ success: true, data: result })
  } catch (error) {
    console.error('Error adding document:', error)
    return res.status(500).json({
      error: 'Failed to add document',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/knowledge/documents/:id
 * Get a document by ID
 */
router.get('/documents/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const document = await prisma.knowledgeDocument.findFirst({
      where: { id, companyId: req.companyId },
      include: {
        chunks: {
          select: {
            id: true,
            sequence: true,
            content: true,
            embeddingModel: true,
          },
        },
      },
    })

    if (!document) {
      return res.status(404).json({ error: 'Document not found' })
    }

    return res.json({
      success: true,
      data: document,
    })
  } catch (error) {
    console.error('Error retrieving document:', error)
    return res.status(500).json({
      error: 'Failed to retrieve document',
    })
  }
})

/**
 * GET /api/knowledge/companies/:companyId/documents
 * List all documents for a company
 */
router.get('/companies/:companyId/documents', async (req: Request, res: Response) => {
  try {
    const companyId = Array.isArray(req.params.companyId) ? req.params.companyId[0] : req.params.companyId
    if (companyId !== req.companyId) return res.status(403).json({ error: 'Company access denied' })
    const query = ListKnowledgeDocumentsQuerySchema.parse(req.query)
    const skip = (query.page - 1) * query.limit

    const documents = await prisma.knowledgeDocument.findMany({
      where: { companyId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        _count: { select: { chunks: true } },
      },
      skip,
      take: query.limit,
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.knowledgeDocument.count({
      where: { companyId },
    })

    return res.json({
      success: true,
      data: documents,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    })
  } catch (error) {
    console.error('Error listing documents:', error)
    return res.status(500).json({
      error: 'Failed to list documents',
    })
  }
})

/**
 * DELETE /api/knowledge/documents/:id
 * Delete a document
 */
router.delete('/documents/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const document = await prisma.knowledgeDocument.findFirst({
      where: { id, companyId: req.companyId },
    })

    if (!document) {
      return res.status(404).json({ error: 'Document not found' })
    }

    await knowledgeService.deleteDocument(id, req.companyId)

    return res.json({
      success: true,
      message: 'Document deleted',
    })
  } catch (error) {
    console.error('Error deleting document:', error)
    return res.status(500).json({
      error: 'Failed to delete document',
    })
  }
})

/**
 * POST /api/knowledge/documents/:id/reindex
 * Reindex a document
 */
router.post('/documents/:id/reindex', adminOnly, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const document = await prisma.knowledgeDocument.findFirst({
      where: { id, companyId: req.companyId },
    })

    if (!document) {
      return res.status(404).json({ error: 'Document not found' })
    }

    const result = await knowledgeService.reindexDocument(id, req.companyId)

    return res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Error reindexing document:', error)
    return res.status(500).json({
      error: 'Failed to reindex document',
    })
  }
})

/**
 * POST /api/knowledge/search
 * Search for relevant documents
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const parsed = SearchKnowledgeSchema.parse(req.body)

    const results = await knowledgeService.retrieveDocuments({
      query: parsed.query,
      companyId: req.companyId!,
      topK: parsed.topK,
      threshold: parsed.threshold,
    })

    return res.json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error('Error searching knowledge base:', error)
    return res.status(500).json({
      error: 'Failed to search knowledge base',
    })
  }
})

export default router
