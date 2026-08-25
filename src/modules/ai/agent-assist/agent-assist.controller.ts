import { Request, Response } from 'express'
import { agentAssistService } from './agent-assist.service'

export const generateReplySuggestion = async (req: Request, res: Response) => {
  try {
    const conversationId = Array.isArray(req.params.conversationId) 
      ? req.params.conversationId[0] 
      : req.params.conversationId
    const { userMessage, conversationHistory } = req.body
    const companyId = (req as any).user?.companyId

    if (!conversationId || !userMessage || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'conversationId, userMessage, and companyId are required',
      })
    }

    const result = await agentAssistService.generateReplySuggestion(
      conversationId,
      companyId,
      userMessage,
      conversationHistory
    )

    return res.json({ success: true, data: result })
  } catch (error) {
    console.error('Generate reply suggestion error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unable to generate reply suggestion',
    })
  }
}

export const generateSummary = async (req: Request, res: Response) => {
  try {
    const conversationId = Array.isArray(req.params.conversationId) 
      ? req.params.conversationId[0] 
      : req.params.conversationId
    const { conversationHistory } = req.body
    const companyId = (req as any).user?.companyId

    if (!conversationId || !conversationHistory || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'conversationId, conversationHistory, and companyId are required',
      })
    }

    const result = await agentAssistService.generateConversationSummary(
      conversationId,
      companyId,
      conversationHistory
    )

    return res.json({ success: true, data: result })
  } catch (error) {
    console.error('Generate summary error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unable to generate summary',
    })
  }
}

export const generateNextAction = async (req: Request, res: Response) => {
  try {
    const conversationId = Array.isArray(req.params.conversationId) 
      ? req.params.conversationId[0] 
      : req.params.conversationId
    const { conversationHistory } = req.body
    const companyId = (req as any).user?.companyId

    if (!conversationId || !conversationHistory || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'conversationId, conversationHistory, and companyId are required',
      })
    }

    const result = await agentAssistService.generateNextAction(
      conversationId,
      companyId,
      conversationHistory
    )

    return res.json({ success: true, data: result })
  } catch (error) {
    console.error('Generate next action error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unable to generate next action',
    })
  }
}

export const generateTags = async (req: Request, res: Response) => {
  try {
    const conversationId = Array.isArray(req.params.conversationId) 
      ? req.params.conversationId[0] 
      : req.params.conversationId
    const { conversationHistory } = req.body
    const companyId = (req as any).user?.companyId

    if (!conversationId || !conversationHistory || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'conversationId, conversationHistory, and companyId are required',
      })
    }

    const result = await agentAssistService.generateSuggestedTags(
      conversationId,
      companyId,
      conversationHistory
    )

    return res.json({ success: true, data: result })
  } catch (error) {
    console.error('Generate tags error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unable to generate tags',
    })
  }
}

export const generateNotes = async (req: Request, res: Response) => {
  try {
    const conversationId = Array.isArray(req.params.conversationId) 
      ? req.params.conversationId[0] 
      : req.params.conversationId
    const { conversationHistory } = req.body
    const companyId = (req as any).user?.companyId

    if (!conversationId || !conversationHistory || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'conversationId, conversationHistory, and companyId are required',
      })
    }

    const result = await agentAssistService.generateConversationNotes(
      conversationId,
      companyId,
      conversationHistory
    )

    return res.json({ success: true, data: result })
  } catch (error) {
    console.error('Generate notes error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unable to generate notes',
    })
  }
}
