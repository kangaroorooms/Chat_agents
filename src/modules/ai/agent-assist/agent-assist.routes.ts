import { Router } from 'express'
import { authMiddleware } from '../../../middleware/auth.middleware'
import { requireRole } from '../../../middleware/authorize.middleware'
import {
  generateReplySuggestion,
  generateSummary,
  generateNextAction,
  generateTags,
  generateNotes,
} from './agent-assist.controller'

const router = Router({ mergeParams: true })

/**
 * Agent Assist routes
 * POST /conversations/:conversationId/agent-assist/reply
 * POST /conversations/:conversationId/agent-assist/summary
 * POST /conversations/:conversationId/agent-assist/next-action
 * POST /conversations/:conversationId/agent-assist/tags
 * POST /conversations/:conversationId/agent-assist/notes
 */

router.post('/reply', authMiddleware, requireRole(['AGENT', 'ADMIN', 'SUPER_ADMIN']), generateReplySuggestion)
router.post('/summary', authMiddleware, requireRole(['AGENT', 'ADMIN', 'SUPER_ADMIN']), generateSummary)
router.post('/next-action', authMiddleware, requireRole(['AGENT', 'ADMIN', 'SUPER_ADMIN']), generateNextAction)
router.post('/tags', authMiddleware, requireRole(['AGENT', 'ADMIN', 'SUPER_ADMIN']), generateTags)
router.post('/notes', authMiddleware, requireRole(['AGENT', 'ADMIN', 'SUPER_ADMIN']), generateNotes)

export default router
