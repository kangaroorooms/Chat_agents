import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware'
import { requireCompanyContext } from '../../middleware/company.middleware'
import { createMessage, listMessages, getMessage, editMessage, deleteMessage } from './message.controller'

const router = Router()

router.post('/', authMiddleware, requireCompanyContext, createMessage)

router.get('/conversations/:conversationId', authMiddleware, requireCompanyContext, listMessages)

router.get('/:messageId', authMiddleware, requireCompanyContext, getMessage)

router.patch('/:messageId', authMiddleware, requireCompanyContext, editMessage)

router.delete('/:messageId', authMiddleware, requireCompanyContext, deleteMessage)

export default router