import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware'
import { requireCompanyContext } from '../../middleware/company.middleware'
import { requireRole } from '../../middleware/authorize.middleware'
import { auditLogService } from './audit.service'

const router = Router()
router.use(authMiddleware, requireCompanyContext, requireRole(['ADMIN', 'SUPER_ADMIN']))
router.get('/', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit ?? 50) || 50, 1), 100)
  const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0)
  res.json({ success: true, data: await auditLogService.getCompanyLogs(req.companyId!, { limit, offset, action: typeof req.query.action === 'string' ? req.query.action as any : undefined }) })
})
router.get('/:id', async (req, res) => {
  const log = await auditLogService.getLog(String(req.params.id))
  if (!log || log.companyId !== req.companyId) return res.status(404).json({ success: false, message: 'Audit log not found' })
  res.json({ success: true, data: log })
})
export default router
