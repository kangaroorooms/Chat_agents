import { Request, Response } from 'express'
import { messageService } from './message.service'
import { CreateMessageSchema, ListMessagesQuery, EditMessageSchema } from './message.dto'
import { ConversationService } from '../conversations/conversation.service'
import { getIo } from '../socket/socket.server'
import { SocketEvents } from '../socket/eventRegistry'
import { classifierService } from '../ai/classifier/classifier.service'
import { assistantService } from '../ai/assistant/assistant.service'
import { conversationWorkflowService } from '../conversations/conversation.workflow'
import { prisma } from '../../config/prisma'
import { sentimentService } from '../ai/sentiment/sentiment.service'
import { analyticsService } from '../ai/analytics/analytics.service'
import { assertCompanyResourceOwnership } from '../../security/resource-ownership'

const conversationService = new ConversationService()

const standardResponse = (res: Response, data: any, message = '', pagination?: any, status = 200) =>
  res.status(status).json({ success: true, message, data, pagination: pagination || null })

export const createMessage = async (req: Request, res: Response) => {
  try {
    const parsed = CreateMessageSchema.parse(req.body)
    await assertCompanyResourceOwnership(req.companyId!, 'conversation', parsed.conversationId)
    const msg = await messageService.createMessage(req.userId as string, parsed, req.companyId)

    try {
      const io = getIo()
      const room = `conversation:${msg.conversationId}`
      io.to(room).emit(SocketEvents.MESSAGE_CREATED, msg)

      const conversation = await conversationService.getConversationById(req.userId as string, msg.conversationId)
      if (conversation.ownerId && conversation.ownerId !== req.userId) {
        io.to(`user:${conversation.ownerId}`).emit(SocketEvents.CONVERSATION_UPDATED, {
          conversationId: msg.conversationId,
          ownerId: conversation.ownerId,
          queueState: conversation.queueState,
        })
      } else if (!conversation.ownerId && conversation.state === 'OPEN' && ['NEW', 'ESCALATED'].includes(conversation.queueState) && conversation.companyId) {
        io.to(`company:${conversation.companyId}`).emit(SocketEvents.CONVERSATION_UPDATED, {
          conversationId: msg.conversationId,
          queueState: conversation.queueState,
        })
      }
    } catch {
      // Socket server may not be initialized in some test environments.
    }

    // Autonomous AI handling for customer messages
    try {
      // only classify if sender is a customer and message has content
      if (msg && msg.senderId) {
        const sender = await prisma.user.findUnique({ where: { id: msg.senderId } })
          if (sender && sender.role === 'CUSTOMER' && parsed.content && parsed.content.trim().length > 0) {
            const conversationForAI = await conversationService.getConversationById(req.userId as string, msg.conversationId)
            const companyId = (conversationForAI && conversationForAI.companyId) ?? sender.companyId ?? req.companyId
            const classification = await classifierService.classify(parsed.content, companyId ?? undefined)
            const sentiment = sentimentService.analyze(parsed.content)
            // record incoming message sentiment
            try {
              if (companyId) await analyticsService.record({ companyId, conversationId: msg.conversationId, messageId: msg.id, eventType: 'INCOMING_MESSAGE', metadata: { sentiment } })
            } catch (e) {
              // ignore
            }

            const aiSettings = await (prisma as any).aiSettings?.findUnique({ where: { companyId: companyId ?? '' } })

          // If no ai settings or autoReply disabled, skip
          if (aiSettings && aiSettings.autoReplyEnabled) {
            const answerResult = await assistantService.generateAnswer(companyId ?? '', parsed.content)
            const confidenceThreshold = Number(aiSettings.confidenceThreshold ?? 0.7)

            const shouldAutoReply = Number(answerResult.confidence) >= confidenceThreshold

            if (shouldAutoReply) {
              // Store AI reply in conversation metadata and emit domain event
              await conversationWorkflowService.addAIReply('AI_SYSTEM', msg.conversationId, { content: answerResult.answer, confidence: answerResult.confidence, sources: answerResult.sources })
              // record analytics for AI handled
              try {
                if (companyId) await analyticsService.record({ companyId, conversationId: msg.conversationId, messageId: msg.id, eventType: 'AI_HANDLED', confidence: answerResult.confidence })
              } catch (e) {}

              // broadcast a synthetic message event to conversation room so UIs can show AI reply in real-time
              const io = getIo()
              const synthetic = {
                id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                content: answerResult.answer,
                senderId: 'ai-system',
                conversationId: msg.conversationId,
                createdAt: new Date().toISOString(),
                ai: true,
                confidence: answerResult.confidence,
                sources: answerResult.sources,
              }
              io.to(`conversation:${msg.conversationId}`).emit(SocketEvents.MESSAGE_CREATED, synthetic)

              // Optionally auto-resolve
              if (aiSettings.autoResolveEnabled) {
                try {
                  await conversationWorkflowService.resolve('AI_SYSTEM', msg.conversationId)
                } catch (err) {
                  // ignore resolve errors
                }
              }
            } else {
              // request handoff if low confidence or escalation intent
              const shouldHandoff = classification.intent === 'escalation_request' || classification.intent === 'refund_request' || answerResult.confidence < Number(aiSettings.confidenceThreshold ?? 0.7)
              if (shouldHandoff) {
                await conversationWorkflowService.requestAIOperation('AI_SYSTEM', msg.conversationId, `Auto-handoff due to classification ${classification.intent} or low confidence`)
                try {
                  if (companyId) await analyticsService.record({ companyId, conversationId: msg.conversationId, messageId: msg.id, eventType: 'AI_HANDOFF_REQUEST', confidence: answerResult.confidence, metadata: { classification } })
                } catch (e) {}
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('AI autonomous handling error:', err)
    }

    return standardResponse(res, msg, 'Created', undefined, 201)
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unknown error', data: null })
  }
}

export const listMessages = async (req: Request, res: Response) => {
  try {
    const q = ListMessagesQuery.parse(req.query)
    const conversationId = req.params.conversationId as string
    await assertCompanyResourceOwnership(req.companyId!, 'conversation', conversationId)
    const result = await messageService.listMessages(req.userId as string, conversationId, { limit: q.limit, cursor: q.cursor }, req.companyId)
    return standardResponse(res, result.items, 'OK', result.pagination)
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unknown error', data: null })
  }
}

export const getMessage = async (req: Request, res: Response) => {
  try {
    const id = req.params.messageId as string
    await assertCompanyResourceOwnership(req.companyId!, 'message', id)
    const msg = await messageService.getMessageById(req.userId as string, id, req.companyId)
    return standardResponse(res, msg)
  } catch (error) {
    return res.status(404).json({ success: false, message: error instanceof Error ? error.message : 'Not found', data: null })
  }
}

export const editMessage = async (req: Request, res: Response) => {
  try {
    const parsed = EditMessageSchema.parse(req.body)
    const id = req.params.messageId as string
    await assertCompanyResourceOwnership(req.companyId!, 'message', id)
    const updated = await messageService.editMessage(req.userId as string, id, parsed.content, parsed.metadata, req.companyId)
    return standardResponse(res, updated)
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unknown error', data: null })
  }
}

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const id = req.params.messageId as string
    await assertCompanyResourceOwnership(req.companyId!, 'message', id)
    const result = await messageService.deleteMessage(req.userId as string, id, req.companyId)
    return standardResponse(res, result)
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unknown error', data: null })
  }
}
