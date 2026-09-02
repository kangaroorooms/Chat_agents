import { Router } from "express";
import { authMiddleware } from '../../middleware/auth.middleware'
import { authLimiter } from '../../middleware/rate-limit.middleware'
import { requireCompanyContext } from '../../middleware/company.middleware'

import {
  login,
  register,
  refresh,
  logout,
  logoutAll,
  sessions,
  revokeSession,
} from "./auth.controller";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);
router.post('/logout-all', authMiddleware, requireCompanyContext, logoutAll);
router.get('/sessions', authMiddleware, requireCompanyContext, sessions);
router.delete('/sessions/:id', authMiddleware, requireCompanyContext, revokeSession);

export default router;