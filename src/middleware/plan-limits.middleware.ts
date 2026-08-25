import { NextFunction, Request, Response } from 'express'
import { billingService, PlanResource } from '../modules/billing/billing.service'

export const checkPlanLimits = (resource: PlanResource) => async (req: Request, res: Response, next: NextFunction) => {
  const companyId = req.companyId || req.user?.companyId || req.body?.companyId
  if (!companyId) return res.status(403).json({ success: false, message: 'Company context required' })
  if (!(await billingService.checkPlanLimits(companyId, resource))) return res.status(402).json({ success: false, message: `Your subscription limit for ${resource} has been reached` })
  next()
}
