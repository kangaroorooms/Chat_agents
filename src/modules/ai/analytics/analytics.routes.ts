import { Router } from 'express'
import { authMiddleware } from '../../../middleware/auth.middleware'
import { requireRole } from '../../../middleware/authorize.middleware'
import {
  getAnalyticsOverview,
  getConfidenceDistribution,
  getTrends,
  getEventTypeDistribution,
  getIntentDistribution,
} from './analytics.controller'

const router = Router({ mergeParams: true })

/**
 * Analytics routes for companies
 * GET /companies/:companyId/analytics/overview
 * GET /companies/:companyId/analytics/confidence-distribution
 * GET /companies/:companyId/analytics/trends
 * GET /companies/:companyId/analytics/event-distribution
 * GET /companies/:companyId/analytics/intent-distribution
 */

router.get('/overview', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), getAnalyticsOverview)
router.get('/confidence-distribution', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), getConfidenceDistribution)
router.get('/trends', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), getTrends)
router.get('/event-distribution', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), getEventTypeDistribution)
router.get('/intent-distribution', authMiddleware, requireRole(['ADMIN', 'SUPER_ADMIN']), getIntentDistribution)

export default router
