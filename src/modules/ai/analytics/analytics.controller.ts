import { Request, Response } from 'express'
import { analyticsAPIService } from './analytics-api.service'

export const getAnalyticsOverview = async (req: Request, res: Response) => {
  try {
    const companyId = req.params.companyId as string

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'companyId is required' })
    }

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
    const companyId = req.params.companyId as string
    const days = parseInt(req.query.days as string) || 30

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'companyId is required' })
    }

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
    const companyId = req.params.companyId as string
    const days = parseInt(req.query.days as string) || 30

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'companyId is required' })
    }

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
    const companyId = req.params.companyId as string
    const days = parseInt(req.query.days as string) || 30

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'companyId is required' })
    }

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
    const companyId = req.params.companyId as string
    const days = parseInt(req.query.days as string) || 30

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'companyId is required' })
    }

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
