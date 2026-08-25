import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/authorize.middleware'
import { listCompanies, getCompany, createCompany, updateCompany, deleteCompany } from './company.controller'
import aiSettingsRouter from './ai-settings.routes'

const router = Router()

router.get('/', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), listCompanies)
router.get('/:id', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), getCompany)
router.post('/', authMiddleware, requireRole(['SUPER_ADMIN']), createCompany)
router.patch('/:id', authMiddleware, requireRole(['SUPER_ADMIN']), updateCompany)
router.delete('/:id', authMiddleware, requireRole(['SUPER_ADMIN']), deleteCompany)

// AI settings routes (company-scoped)
router.use('/:companyId/ai-settings', aiSettingsRouter)

export default router
