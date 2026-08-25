import { Router } from "express";
import { authMiddleware } from '../../middleware/auth.middleware'

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

router.post("/register", register);
router.post("/login", login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/logout-all', authMiddleware, logoutAll);
router.get('/sessions', authMiddleware, sessions);
router.delete('/sessions/:id', authMiddleware, revokeSession);

export default router;