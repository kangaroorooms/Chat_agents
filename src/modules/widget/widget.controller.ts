import { Request, Response } from 'express'
import { widgetService } from './widget.service'

export const startConversation = async (req: Request, res: Response) => {
  try {
    const { companyId, visitorName, visitorEmail } = req.body
    
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'companyId is required' })
    }

    const sessionId = req.query.sessionId as string || ''
    const visitor = await widgetService.getOrCreateVisitor(companyId, sessionId)
    
    if (visitorName || visitorEmail) {
      await widgetService.updateVisitor(visitor.sessionId, { name: visitorName, email: visitorEmail })
    }

    const conversation = await widgetService.startConversation(
      companyId,
      visitor.id,
      visitorName,
      visitorEmail
    )

    return res.status(201).json({
      success: true,
      data: {
        conversationId: conversation.id,
        visitorSessionId: visitor.sessionId,
      },
    })
  } catch (error) {
    console.error('Start conversation error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unable to start conversation',
    })
  }
}

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { conversationId, message } = req.body

    if (!conversationId || !message) {
      return res.status(400).json({ success: false, message: 'conversationId and message are required' })
    }

    const result = await widgetService.sendMessage(conversationId, message, 'visitor')

    return res.status(201).json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Send message error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unable to send message',
    })
  }
}

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'conversationId is required' })
    }

    const messages = await widgetService.getMessages(conversationId, limit)

    return res.json({
      success: true,
      data: messages.reverse(),
    })
  } catch (error) {
    console.error('Get messages error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unable to get messages',
    })
  }
}
