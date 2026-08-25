import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware'
import { createMessage, listMessages, getMessage, editMessage, deleteMessage } from './message.controller'

const router = Router()

router.post('/', authMiddleware, createMessage)

router.get('/conversations/:conversationId', authMiddleware, listMessages)

router.get('/:messageId', authMiddleware, getMessage)

router.patch('/:messageId', authMiddleware, editMessage)

router.delete('/:messageId', authMiddleware, deleteMessage)

export default router