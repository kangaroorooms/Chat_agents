import { Router } from 'express'
import { startConversation, sendMessage, getMessages } from './widget.controller'
import { requireWidgetToken } from '../../middleware/widget.middleware'
import { widgetLimiter } from '../../middleware/rate-limit.middleware'

const router = Router()

/**
 * Public widget routes (no authentication required)
 * POST /widget/start-conversation - Start a new widget conversation
 * POST /widget/send-message - Send a message in widget conversation
 * GET /widget/messages/:conversationId - Get messages
 */

router.use(widgetLimiter, requireWidgetToken)
router.post('/start-conversation', startConversation)
router.post('/send-message', sendMessage)
router.get('/messages/:conversationId', getMessages)

export default router
