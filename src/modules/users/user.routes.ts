import { Router } from 'express'

import { authMiddleware } from '../../middleware/auth.middleware'
import { requireRole } from '../../middleware/authorize.middleware'
import { getMe, getUsers, getUser, createUser, updateUser, deleteUser, searchAgents } from './user.controller'

const router = Router()

router.get('/me', authMiddleware, getMe)
router.get('/agents', authMiddleware, searchAgents)
router.get('/', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), getUsers)
router.get('/:id', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), getUser)
router.post('/', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), createUser)
router.patch('/:id', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), updateUser)
router.delete('/:id', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), deleteUser)

export default router
