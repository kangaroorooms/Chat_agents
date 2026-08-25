import { Request, Response } from 'express'

import { conversationService } from './conversation.service'
import { conversationWorkflowService } from './conversation.workflow'
import { CreateConversationSchema, ListConversationsQuery, ChangeStateSchema, ParticipantSchema, AssignOwnerSchema, TransferConversationSchema, EscalateConversationSchema, HandoffToAgentSchema } from './conversation.dto'

const standardResponse = (res: Response, data: any, message = '', pagination?: any, status = 200) =>
  res.status(status).json({ success: true, message, data, pagination: pagination || null })

export const createConversation = async (req: Request, res: Response) => {
  try {
    const parsed = CreateConversationSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid payload', data: null, details: parsed.error.format() })

    const conversation = await conversationService.createConversation(req.userId as string, parsed.data.participantId)
    return standardResponse(res, conversation, 'Created', undefined, 201)
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unknown error', data: null })
  }
}

export const listConversations = async (req: Request, res: Response) => {
  try {
    const q = ListConversationsQuery.parse(req.query)
    const result = await conversationService.listConversations(req.userId as string, { limit: q.limit, cursor: q.cursor, search: q.search, state: q.state })
    return standardResponse(res, result.items, 'OK', result.pagination)
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unknown error', data: null })
  }
}

export const getAgentQueue = async (req: Request, res: Response) => {
  try {
    const q = ListConversationsQuery.parse(req.query)
    const companyId = req.user?.companyId
    const result = await conversationService.listAgentQueue(req.userId as string, {
      limit: q.limit,
      cursor: q.cursor,
      search: q.search,
      companyId,
    })
    return standardResponse(res, result.items, 'OK', result.pagination)
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unknown error', data: null })
  }
}

export const deleteConversation = async (req: Request, res: Response) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ success: false, message: 'Missing auth', data: null })

    const conversationId = req.params.conversationId as string

    const result = await conversationService.deleteConversation(userId, conversationId)

    return standardResponse(res, result)
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export const getConversation = async (req: Request, res: Response) => {
  try {
    const id = req.params.conversationId as string
    const conversation = await conversationService.getConversationById(req.userId as string, id)
    return standardResponse(res, conversation)
  } catch (error) {
    return res.status(404).json({ success: false, message: error instanceof Error ? error.message : 'Not found', data: null })
  }
}

export const changeState = async (req: Request, res: Response) => {
  try {
    const parsed = ChangeStateSchema.parse(req.body)
    let updated

    if (parsed.state === 'PENDING') {
      updated = await conversationWorkflowService.resolve(req.userId as string, req.params.conversationId as string)
    } else if (parsed.state === 'CLOSED') {
      updated = await conversationWorkflowService.close(req.userId as string, req.params.conversationId as string)
    } else if (parsed.state === 'OPEN') {
      updated = await conversationWorkflowService.reopen(req.userId as string, req.params.conversationId as string)
    } else {
      throw new Error('State transition not supported through this endpoint')
    }

    return standardResponse(res, updated)
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unknown error', data: null })
  }
}

export const addParticipant = async (req: Request, res: Response) => {
  try {
    const parsed = ParticipantSchema.parse(req.body)
    const result = await conversationService.addParticipant(req.userId as string, req.params.conversationId as string, parsed.userId)
    return standardResponse(res, result)
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unknown error', data: null })
  }
}

export const removeParticipant = async (req: Request, res: Response) => {
  try {
    const participantId = req.params.participantId as string
    const result = await conversationService.removeParticipant(req.userId as string, req.params.conversationId as string, participantId)
    return standardResponse(res, result)
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unknown error', data: null })
  }
}

export const assignOwner = async (req: Request, res: Response) => {
  try {
    const parsed = AssignOwnerSchema.parse(req.body)
    const result = await conversationWorkflowService.assign(req.userId as string, req.params.conversationId as string, parsed.ownerId)
    return standardResponse(res, result)
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unknown error', data: null })
  }
}

export const transferConversation = async (req: Request, res: Response) => {
  try {
    const parsed = TransferConversationSchema.parse(req.body)
    const result = await conversationWorkflowService.transfer(req.userId as string, req.params.conversationId as string, parsed.toAgentId)
    return standardResponse(res, result)
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unknown error', data: null })
  }
}

export const escalateConversation = async (req: Request, res: Response) => {
  try {
    const parsed = EscalateConversationSchema.parse(req.body)
    const result = await conversationWorkflowService.escalate(req.userId as string, req.params.conversationId as string, parsed.targetAgentId)
    return standardResponse(res, result)
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unknown error', data: null })
  }
}

export const resolveConversation = async (req: Request, res: Response) => {
  try {
    const result = await conversationWorkflowService.resolve(req.userId as string, req.params.conversationId as string)
    return standardResponse(res, result)
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unknown error', data: null })
  }
}

export const closeConversation = async (req: Request, res: Response) => {
  try {
    const result = await conversationWorkflowService.close(req.userId as string, req.params.conversationId as string)
    return standardResponse(res, result)
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unknown error', data: null })
  }
}

export const reopenConversation = async (req: Request, res: Response) => {
  try {
    const result = await conversationWorkflowService.reopen(req.userId as string, req.params.conversationId as string)
    return standardResponse(res, result)
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unknown error', data: null })
  }
}

export const handoffToAI = async (req: Request, res: Response) => {
  try {
    const result = await conversationWorkflowService.handoffToAI(req.userId as string, req.params.conversationId as string)
    return standardResponse(res, result)
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unknown error', data: null })
  }
}

export const handoffToAgent = async (req: Request, res: Response) => {
  try {
    const parsed = HandoffToAgentSchema.parse(req.body)
    const result = await conversationWorkflowService.handoffToAgent(req.userId as string, req.params.conversationId as string, parsed.agentId)
    return standardResponse(res, result)
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unknown error', data: null })
  }
}
