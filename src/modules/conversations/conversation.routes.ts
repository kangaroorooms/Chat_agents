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
import { requireCompanyContext } from "../../middleware/company.middleware";
import { requireRole } from "../../middleware/authorize.middleware";

const router = Router();

router.post("/", authMiddleware, requireCompanyContext, createConversation);

router.get(
  "/",
  authMiddleware,
  requireCompanyContext,
  listConversations
);

router.get(
  "/queue",
  authMiddleware,
  requireCompanyContext,
  requireRole(['AGENT','ADMIN','SUPER_ADMIN']),
  getAgentQueue
);

router.delete(
    "/:conversationId",
    authMiddleware,
    requireCompanyContext,
    deleteConversation
  );

router.get('/:conversationId', authMiddleware, requireCompanyContext, getConversation)

router.patch('/:conversationId/state', authMiddleware, requireCompanyContext, changeState)
router.patch('/:conversationId/transfer', authMiddleware, requireCompanyContext, transferConversation)
router.patch('/:conversationId/escalate', authMiddleware, requireCompanyContext, escalateConversation)
router.patch('/:conversationId/resolve', authMiddleware, requireCompanyContext, resolveConversation)
router.patch('/:conversationId/close', authMiddleware, requireCompanyContext, closeConversation)
router.patch('/:conversationId/reopen', authMiddleware, requireCompanyContext, reopenConversation)
router.patch('/:conversationId/handoff/ai', authMiddleware, requireCompanyContext, handoffToAI)
router.patch('/:conversationId/handoff/agent', authMiddleware, requireCompanyContext, handoffToAgent)

router.post('/:conversationId/participants', authMiddleware, requireCompanyContext, addParticipant)
router.delete('/:conversationId/participants/:participantId', authMiddleware, requireCompanyContext, removeParticipant)

router.patch('/:conversationId/assign', authMiddleware, requireCompanyContext, assignOwner)

export default router;