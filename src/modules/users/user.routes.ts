import { Router } from 'express'

import { authMiddleware } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/authorize.middleware'
import { requireCompanyContext } from '../../middleware/company.middleware'
import { getMe, getUsers, getUser, createUser, updateUser, deleteUser, searchAgents } from './user.controller'

const router = Router()

router.use(authMiddleware, requireCompanyContext)
router.get('/me', getMe)
router.get('/agents', searchAgents)
router.get('/', requireRole(['ADMIN', 'SUPER_ADMIN']), getUsers)
router.get('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), getUser)
router.post('/', requireRole(['ADMIN', 'SUPER_ADMIN']), createUser)
router.patch('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), updateUser)
router.delete('/:id', requireRole(['ADMIN', 'SUPER_ADMIN']), deleteUser)

export default router
