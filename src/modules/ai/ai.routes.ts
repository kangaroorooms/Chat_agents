import { Router, type Request, type Response } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware'
import { requireCompanyContext } from '../../middleware/company.middleware'
import { getAIService } from './ai.service'
import { messageService } from '../messages/message.service'
import { conversationWorkflowService } from '../conversations/conversation.workflow'
import { analyticsService } from './analytics/analytics.service'
import { prisma } from '../../config/prisma'
import { billingService } from '../billing/billing.service'
import { usageService } from '../billing/usage.service'

const router = Router()
const AI_SYSTEM_USER_ID = 'ai-system'
router.use(authMiddleware, requireCompanyContext)

/**
 * POST /api/ai/chat/:conversationId
 * Stream AI response for a user message
 */
router.post('/chat/:conversationId', async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.conversationId as string
    const { message } = req.body
    const userId = (req as any).user?.userId

    if (!message || !userId) {
      return res.status(400).json({ error: 'Message and userId required' })
    }
    const billableConversation = await prisma.conversation.findFirst({ where: { id: conversationId, companyId: req.companyId }, select: { companyId: true } })
    if (!billableConversation) return res.status(404).json({ error: 'Conversation not found' })
    if (billableConversation?.companyId && !(await billingService.checkPlanLimits(billableConversation.companyId, 'aiRequests'))) return res.status(402).json({ error: 'AI request limit reached for this subscription' })

    // Create user message first
    const userMessage = await messageService.createMessage(userId, {
      conversationId,
      content: message,
    })

    // Stream response from AI
    const aiService = getAIService()
    const stream = aiService.generateResponseStream(conversationId, message)

    // Set streaming response headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    let fullResponse = ''
    let streamEnded = false

    try {
      for await (const chunk of stream) {
        fullResponse += chunk
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
      }
    } catch (streamError) {
      console.error('Stream generation error:', streamError)
      res.write(`data: ${JSON.stringify({ error: 'Stream generation failed' })}\n\n`)
    }

    // After streaming, create AI message and publish event
    if (fullResponse) {
      const aiMessage = await messageService.createMessage(AI_SYSTEM_USER_ID, {
        conversationId,
        content: fullResponse,
      })
      if (billableConversation?.companyId) {
        const inputTokens = Math.ceil(message.length / 4)
        const outputTokens = Math.ceil(fullResponse.length / 4)
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
        // Conservative public-list-price estimate; configure a dedicated rate table for custom models.
        const estimatedCost = (inputTokens * 0.15 + outputTokens * 0.6) / 1_000_000
        await usageService.recordAiCost(billableConversation.companyId, { provider: 'openai', model, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, estimatedCost })
      }

      // Check if handoff is needed
      const confidence = 0.7 // placeholder
      if (confidence < 0.7) {
        await conversationWorkflowService.requestAIOperation(
          AI_SYSTEM_USER_ID,
          conversationId,
          'Low confidence response - requiring human assistance',
          userId
        )
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error) {
    console.error('AI chat error:', error)
    res.status(500).json({
      error: 'Failed to generate response',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/ai/suggestions/:conversationId
 * Generate response suggestions for agents
 */
router.post('/suggestions/:conversationId', async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.conversationId as string
    const { message } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message required' })
    }

    const aiService = getAIService()
    const suggestions = await aiService.generateSuggestions(conversationId, message)

    // Persist suggestions onto conversation metadata and emit domain event
    try {
      await conversationWorkflowService.addAISuggestions('ai-system', conversationId, suggestions.suggestions)
    } catch (e) {
      // non-fatal; still return suggestions
      console.error('Failed to persist AI suggestions:', e)
    }

    res.json(suggestions)
  } catch (error) {
    console.error('Suggestions error:', error)
    res.status(500).json({
      error: 'Failed to generate suggestions',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/ai/conversations/:conversationId/suggest
 * Convenience endpoint to generate and persist suggestions for a conversation
 */
router.post('/conversations/:conversationId/suggest', async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.conversationId as string

    // Attempt to derive last user message if caller didn't supply one
    const { message } = req.body
    let msgToUse = message

    if (!msgToUse) {
      const messages = await messageService.listMessages((req as any).user?.userId || 'system', conversationId, { limit: 1 })
      msgToUse = messages.items && messages.items.length > 0 ? messages.items[messages.items.length - 1].content : ''
    }

    if (!msgToUse) {
      return res.status(400).json({ error: 'No message available to generate suggestions' })
    }

    const aiService = getAIService()
    const suggestions = await aiService.generateSuggestions(conversationId, msgToUse)

    await conversationWorkflowService.addAISuggestions('ai-system', conversationId, suggestions.suggestions)

    res.json(suggestions)
  } catch (error) {
    console.error('Conversations suggest error:', error)
    res.status(500).json({ error: 'Failed to generate suggestions', details: error instanceof Error ? error.message : 'Unknown error' })
  }
})

/**
 * GET /api/ai/analytics
 * Query AI analytics for a company
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const companyId = req.companyId
    if (!companyId) return res.status(400).json({ error: 'companyId required' })
    const items = await analyticsService.list(String(companyId), { limit: 200 })
    res.json({ items })
  } catch (err) {
    console.error('Analytics list error', err)
    res.status(500).json({ error: 'Failed to list analytics' })
  }
})

/**
 * POST /api/ai/summarize/:conversationId
 * Summarize conversation
 */
router.post('/summarize/:conversationId', async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.conversationId as string

    // Get all messages for conversation
    const messages = await messageService.listMessages(
      (req as any).user?.userId || 'system',
      conversationId,
      { limit: 1000 }
    )

    if (!messages.items || messages.items.length === 0) {
      return res.json({ summary: 'No messages to summarize', keyPoints: [] })
    }

    const aiService = getAIService()
    const summary = await aiService.summarizeConversation(messages.items)

    // Store summary in conversation metadata
    await conversationWorkflowService.addAISummary(
      AI_SYSTEM_USER_ID,
      conversationId,
      summary.summary
    )

    res.json(summary)
  } catch (error) {
    console.error('Summarize error:', error)
    res.status(500).json({
      error: 'Failed to summarize',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export { router as aiRoutes }
