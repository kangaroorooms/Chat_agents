import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware'
import { requireCompanyContext } from '../../middleware/company.middleware'
import { requireRole } from '../../middleware/authorize.middleware'
import { getAISettings, createAISettings, updateAISettings } from './ai-settings.controller'

const router = Router({ mergeParams: true })

router.use(authMiddleware, requireCompanyContext)
router.get('/', requireRole(['ADMIN', 'SUPER_ADMIN']), getAISettings)
router.post('/', requireRole(['ADMIN', 'SUPER_ADMIN']), createAISettings)
router.patch('/', requireRole(['ADMIN', 'SUPER_ADMIN']), updateAISettings)

export default router
