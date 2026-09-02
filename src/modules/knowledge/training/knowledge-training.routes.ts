import { Router } from 'express'
import { authMiddleware } from '../../../middleware/auth.middleware'
import { requireCompanyContext } from '../../../middleware/company.middleware'
import { requireRole } from '../../../middleware/authorize.middleware'
import {
  trainDocument,
  getTrainingStatus,
  listReadyDocuments,
} from './knowledge-training.controller'

const router = Router({ mergeParams: true })

/**
 * Knowledge Base Training routes
 * POST /companies/:companyId/knowledge/train
 * GET /companies/:companyId/knowledge/training/:documentId/status
 * GET /companies/:companyId/knowledge/ready
 */

router.use(authMiddleware, requireCompanyContext)
router.post('/train', requireRole(['ADMIN', 'SUPER_ADMIN']), trainDocument)
router.get('/training/:documentId/status', getTrainingStatus)
router.get('/ready', listReadyDocuments)

export default router
