import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/authorize.middleware'
import { getAISettings, createAISettings, updateAISettings } from './ai-settings.controller'

const router = Router({ mergeParams: true })

router.get('/', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN', 'ADMIN']), getAISettings)
router.post('/', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), createAISettings)
router.patch('/', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), updateAISettings)

export default router
