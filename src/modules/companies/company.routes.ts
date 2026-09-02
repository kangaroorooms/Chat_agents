import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/authorize.middleware'
import { requireCompanyContext } from '../../middleware/company.middleware'
import { listCompanies, getCompany, createCompany, updateCompany, deleteCompany } from './company.controller'
import aiSettingsRouter from './ai-settings.routes'
import analyticsRouter from '../ai/analytics/analytics.routes'
import trainingRouter from '../knowledge/training/knowledge-training.routes'

const router = Router()

router.get('/', authMiddleware, requireCompanyContext, requireRole(['ADMIN', 'SUPER_ADMIN']), listCompanies)
router.get('/:id', authMiddleware, requireCompanyContext, requireRole(['ADMIN', 'SUPER_ADMIN']), getCompany)
router.post('/', authMiddleware, requireRole(['SUPER_ADMIN']), createCompany)
router.patch('/:id', authMiddleware, requireCompanyContext, requireRole(['SUPER_ADMIN']), updateCompany)
router.delete('/:id', authMiddleware, requireCompanyContext, requireRole(['SUPER_ADMIN']), deleteCompany)

// AI settings routes (company-scoped)
router.use('/:companyId/ai-settings', aiSettingsRouter)
router.use('/:companyId/analytics', analyticsRouter)
router.use('/:companyId/knowledge', trainingRouter)

export default router
