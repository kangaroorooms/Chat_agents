import { Request, Response } from 'express'
import { analyticsAPIService } from './analytics-api.service'
import { z } from 'zod'

const daysSchema = z.coerce.number().int().min(1).max(365).default(30)

const companyFromContext = (req: Request, res: Response): string | null => {
  if (!req.companyId) {
    res.status(403).json({ success: false, message: 'Company context required' })
    return null
  }
  return req.companyId
}

export const getAnalyticsOverview = async (req: Request, res: Response) => {
  try {
    const companyId = companyFromContext(req, res)
    if (!companyId) return

    const overview = await analyticsAPIService.getOverview(companyId)
    return res.json({ success: true, data: overview })
  } catch (error) {
    console.error('Get analytics overview error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unable to get analytics overview',
    })
  }
}

export const getConfidenceDistribution = async (req: Request, res: Response) => {
  try {
    const companyId = companyFromContext(req, res)
    if (!companyId) return
    const days = daysSchema.parse(req.query.days)

    const distribution = await analyticsAPIService.getConfidenceDistribution(companyId, days)
    return res.json({ success: true, data: distribution })
  } catch (error) {
    console.error('Get confidence distribution error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unable to get confidence distribution',
    })
  }
}

export const getTrends = async (req: Request, res: Response) => {
  try {
    const companyId = companyFromContext(req, res)
    if (!companyId) return
    const days = daysSchema.parse(req.query.days)

    const trends = await analyticsAPIService.getTrends(companyId, days)
    return res.json({ success: true, data: trends })
  } catch (error) {
    console.error('Get trends error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unable to get trends',
    })
  }
}

export const getEventTypeDistribution = async (req: Request, res: Response) => {
  try {
    const companyId = companyFromContext(req, res)
    if (!companyId) return
    const days = daysSchema.parse(req.query.days)

    const distribution = await analyticsAPIService.getEventTypeDistribution(companyId, days)
    return res.json({ success: true, data: distribution })
  } catch (error) {
    console.error('Get event type distribution error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unable to get event type distribution',
    })
  }
}

export const getIntentDistribution = async (req: Request, res: Response) => {
  try {
    const companyId = companyFromContext(req, res)
    if (!companyId) return
    const days = daysSchema.parse(req.query.days)

    const distribution = await analyticsAPIService.getIntentDistribution(companyId, days)
    return res.json({ success: true, data: distribution })
  } catch (error) {
    console.error('Get intent distribution error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unable to get intent distribution',
    })
  }
}
