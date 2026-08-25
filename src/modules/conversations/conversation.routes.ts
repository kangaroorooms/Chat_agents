import { Router } from "express";

import {
  createConversation,
  listConversations,
  getAgentQueue,
  getConversation,
  deleteConversation,
  changeState,
  addParticipant,
  removeParticipant,
  assignOwner,
  transferConversation,
  escalateConversation,
  resolveConversation,
  closeConversation,
  reopenConversation,
  handoffToAI,
  handoffToAgent,
} from "./conversation.controller";

import { authMiddleware } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/authorize.middleware";

const router = Router();

router.post(
  "/",
  authMiddleware,
  createConversation
);

router.get(
  "/",
  authMiddleware,
  listConversations
);

router.get(
  "/queue",
  authMiddleware,
  requireRole(['AGENT','ADMIN','SUPER_ADMIN']),
  getAgentQueue
);

router.delete(
    "/:conversationId",
    authMiddleware,
    deleteConversation
  );

router.get('/:conversationId', authMiddleware, getConversation)

router.patch('/:conversationId/state', authMiddleware, changeState)
router.patch('/:conversationId/transfer', authMiddleware, transferConversation)
router.patch('/:conversationId/escalate', authMiddleware, escalateConversation)
router.patch('/:conversationId/resolve', authMiddleware, resolveConversation)
router.patch('/:conversationId/close', authMiddleware, closeConversation)
router.patch('/:conversationId/reopen', authMiddleware, reopenConversation)
router.patch('/:conversationId/handoff/ai', authMiddleware, handoffToAI)
router.patch('/:conversationId/handoff/agent', authMiddleware, handoffToAgent)

router.post('/:conversationId/participants', authMiddleware, addParticipant)
router.delete('/:conversationId/participants/:participantId', authMiddleware, removeParticipant)

router.patch('/:conversationId/assign', authMiddleware, assignOwner)

export default router;