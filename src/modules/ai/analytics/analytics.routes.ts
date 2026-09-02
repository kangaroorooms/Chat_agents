import { Router } from 'express'
import { authMiddleware } from '../../../middleware/auth.middleware'
import { requireCompanyContext } from '../../../middleware/company.middleware'
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

router.use(authMiddleware, requireCompanyContext)
router.get('/overview', requireRole(['ADMIN', 'SUPER_ADMIN']), getAnalyticsOverview)
router.get('/confidence-distribution', requireRole(['ADMIN', 'SUPER_ADMIN']), getConfidenceDistribution)
router.get('/trends', requireRole(['ADMIN', 'SUPER_ADMIN']), getTrends)
router.get('/event-distribution', requireRole(['ADMIN', 'SUPER_ADMIN']), getEventTypeDistribution)
router.get('/intent-distribution', requireRole(['ADMIN', 'SUPER_ADMIN']), getIntentDistribution)

export default router
