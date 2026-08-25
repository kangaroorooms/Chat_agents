import { createServer } from 'http'
import type { IncomingMessage, ServerResponse } from 'http'
import app from '../../app'
import SocketConfig from './config'
import { socketAuthMiddleware } from './token.middleware'
import { connectionManager } from './connectionManager'
import { RoomManager } from './roomManager'
import { initRedisAdapter } from './redisAdapter'
import { messageService } from '../messages/message.service'
import { ConversationService } from '../conversations/conversation.service'
import { conversationWorkflowService } from '../conversations/conversation.workflow'
import {
  RoomJoinSchema,
  RoomLeaveSchema,
  TypingSchema,
  DeliverySchema,
  ReadSchema,
  ConversationReadSchema,
  ConversationAssignSchema,
  ConversationTransferSchema,
  AgentJoinSchema,
} from './socket.dto'

let io: any | null = null

export function initSocketServer(port?: number) {
  const httpServer = createServer(app as any as (req: IncomingMessage, res: ServerResponse) => void)
  // lazy require socket.io to avoid missing compile-time dep
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Server } = require('socket.io')
  const server = new Server(httpServer, {
    path: SocketConfig.path,
    pingInterval: SocketConfig.pingInterval,
    pingTimeout: SocketConfig.pingTimeout,
  })

  // socket middleware for auth
  server.use((socket: any, next: any) => socketAuthMiddleware(socket, next))

  // optionally initialize redis adapter
  const adapter = initRedisAdapter()
  if (adapter) server.adapter(adapter)

  const rooms = new RoomManager(server)

  server.on('connection', (socket: any) => {
    const user = socket && socket.data ? socket.data.user : undefined
    if (user && user.userId) {
      connectionManager.add(user.userId, socket.id)
    }
    socket.on('disconnect', () => {
      if (user && user.userId) connectionManager.remove(user.userId, socket.id)
    })

    // instantiate services used for access checks and orchestration
    const conversationService = new ConversationService()

    if (user && user.userId) {
      socket.join(rooms.userRoom(user.userId))
    }

    // ROOM JOIN
    socket.on('room:join', async (payload: any, ack: Function) => {
      try {
        const parsed = RoomJoinSchema.safeParse(payload)
        if (!parsed.success) return ack?.({ error: 'Invalid payload', details: parsed.error.format() })

        const { type, id } = parsed.data
        if (type === 'conversation') {
          await conversationService.getConversationById(user.userId, id)
          await rooms.joinConversation(socket.id, id)
          socket.join(rooms.conversationRoom(id))

          const deliveries = await messageService.deliverConversationMessages(user.userId, id)
          if (deliveries.length > 0) {
            server.to(rooms.conversationRoom(id)).emit('message:delivered', {
              conversationId: id,
              receipts: deliveries.map((delivery) => ({ messageId: delivery.messageId, deliveredTo: user.userId })),
            })
          }
        } else if (type === 'company') {
          if (!user.companyId || user.companyId !== id) return ack?.({ error: 'Forbidden' })
          socket.join(rooms.companyRoom(id))
        } else if (type === 'agent') {
          if (!user.userId || user.userId !== id) return ack?.({ error: 'Forbidden' })
          socket.join(rooms.agentRoom(id))
        } else {
          return ack?.({ error: 'Unknown room type' })
        }
        return ack?.(null, { success: true })
      } catch (err: any) {
        return ack?.({ error: err?.message || 'Join failed' })
      }
    })

    // ROOM LEAVE
    socket.on('room:leave', async (payload: any, ack: Function) => {
      try {
        const parsed = RoomLeaveSchema.safeParse(payload)
        if (!parsed.success) return ack?.({ error: 'Invalid payload', details: parsed.error.format() })

        const { type, id } = parsed.data
        if (type === 'conversation') {
          await conversationService.getConversationById(user.userId, id)
          await rooms.leaveConversation(socket.id, id)
          socket.leave(rooms.conversationRoom(id))
        } else if (type === 'company') {
          socket.leave(rooms.companyRoom(id))
        } else if (type === 'agent') {
          socket.leave(rooms.agentRoom(id))
        } else {
          return ack?.({ error: 'Unknown room type' })
        }
        return ack?.(null, { success: true })
      } catch (err: any) {
        return ack?.({ error: err?.message || 'Leave failed' })
      }
    })

    // Typing indicator
    socket.on('typing', async (payload: any, ack: Function) => {
      try {
        const parsed = TypingSchema.safeParse(payload)
        if (!parsed.success) return ack?.({ error: 'Invalid payload', details: parsed.error.format() })

        const { conversationId, status } = parsed.data
        await conversationService.getConversationById(user.userId, conversationId)
        const room = rooms.conversationRoom(conversationId)
        server.to(room).emit('typing', { conversationId, userId: user.userId, status })
        return ack?.(null, { success: true })
      } catch (err: any) {
        return ack?.({ error: err?.message || 'Typing failed' })
      }
    })

    // Message create
    socket.on('message:create', async (payload: any, ack: Function) => {
      try {
        const userId = user.userId
        const created = await messageService.createMessage(userId, payload)
        const room = rooms.conversationRoom(created.conversationId)
        // broadcast to conversation room
        server.to(room).emit('message:created', created)
        return ack?.(null, created)
      } catch (err: any) {
        return ack?.({ error: err?.message || 'Create failed' })
      }
    })

    // Message update
    socket.on('message:update', async (payload: { messageId: string; content: string; metadata?: any }, ack: Function) => {
      try {
        const userId = user.userId
        const { messageId, content, metadata } = payload
        const updated = await messageService.editMessage(userId, messageId, content, metadata)
        // fetch message to get conversationId
        const msg = await messageService.getMessageById(userId, messageId)
        const room = rooms.conversationRoom(msg.conversationId)
        server.to(room).emit('message:updated', updated)
        return ack?.(null, updated)
      } catch (err: any) {
        return ack?.({ error: err?.message || 'Update failed' })
      }
    })

    // Message delivery acknowledgement
    socket.on('message:delivered', async (payload: any, ack: Function) => {
      try {
        const parsed = DeliverySchema.safeParse(payload)
        if (!parsed.success) return ack?.({ error: 'Invalid payload', details: parsed.error.format() })

        const { messageId } = parsed.data
        const receipt = await messageService.markMessageDelivered(user.userId, messageId)
        const room = rooms.conversationRoom(receipt.message.conversationId)
        server.to(room).emit('message:delivered', {
          messageId,
          conversationId: receipt.message.conversationId,
          deliveredBy: user.userId,
        })
        return ack?.(null, { success: true })
      } catch (err: any) {
        return ack?.({ error: err?.message || 'Delivery acknowledgement failed' })
      }
    })

    // Message read acknowledgement
    socket.on('message:read', async (payload: any, ack: Function) => {
      try {
        const parsed = ReadSchema.safeParse(payload)
        if (!parsed.success) return ack?.({ error: 'Invalid payload', details: parsed.error.format() })

        const { messageId } = parsed.data
        const receipt = await messageService.markMessageRead(user.userId, messageId)
        const room = rooms.conversationRoom(receipt.message.conversationId)
        server.to(room).emit('message:read', {
          messageId,
          conversationId: receipt.message.conversationId,
          readBy: user.userId,
        })
        return ack?.(null, { success: true })
      } catch (err: any) {
        return ack?.({ error: err?.message || 'Read acknowledgement failed' })
      }
    })

    // Conversation read sync
    socket.on('conversation:read', async (payload: any, ack: Function) => {
      try {
        const parsed = ConversationReadSchema.safeParse(payload)
        if (!parsed.success) return ack?.({ error: 'Invalid payload', details: parsed.error.format() })

        const { conversationId } = parsed.data
        await conversationService.getConversationById(user.userId, conversationId)
        const count = await messageService.markConversationRead(user.userId, conversationId)
        const room = rooms.conversationRoom(conversationId)
        server.to(room).emit('conversation:read', {
          conversationId,
          readBy: user.userId,
          count,
        })
        return ack?.(null, { success: true, count })
      } catch (err: any) {
        return ack?.({ error: err?.message || 'Conversation read failed' })
      }
    })

    // Assign conversation owner / agent
    socket.on('conversation:assign', async (payload: any, ack: Function) => {
      try {
        const parsed = ConversationAssignSchema.safeParse(payload)
        if (!parsed.success) return ack?.({ error: 'Invalid payload', details: parsed.error.format() })

        const { conversationId, ownerId } = parsed.data
        await conversationWorkflowService.assign(user.userId, conversationId, ownerId)
        const room = rooms.conversationRoom(conversationId)
        server.to(room).emit('conversation:assigned', {
          conversationId,
          ownerId,
          assignedBy: user.userId,
        })
        return ack?.(null, { success: true })
      } catch (err: any) {
        return ack?.({ error: err?.message || 'Assign failed' })
      }
    })

    // Transfer conversation to another agent
    socket.on('conversation:transfer', async (payload: any, ack: Function) => {
      try {
        const parsed = ConversationTransferSchema.safeParse(payload)
        if (!parsed.success) return ack?.({ error: 'Invalid payload', details: parsed.error.format() })

        const { conversationId, toAgentId } = parsed.data
        await conversationWorkflowService.transfer(user.userId, conversationId, toAgentId)
        const room = rooms.conversationRoom(conversationId)
        server.to(room).emit('conversation:transferred', {
          conversationId,
          toAgentId,
          transferredBy: user.userId,
        })
        return ack?.(null, { success: true })
      } catch (err: any) {
        return ack?.({ error: err?.message || 'Transfer failed' })
      }
    })

    // Agent join
    socket.on('agent:join', async (payload: any, ack: Function) => {
      try {
        const parsed = AgentJoinSchema.safeParse(payload)
        if (!parsed.success) return ack?.({ error: 'Invalid payload', details: parsed.error.format() })

        const { agentId, conversationId } = parsed.data
        if (user.userId !== agentId) return ack?.({ error: 'Forbidden' })
        const allowedRoles = ['AGENT', 'ADMIN', 'SUPER_ADMIN']
        if (!user.role || !allowedRoles.includes(user.role)) return ack?.({ error: 'Only agents may join' })

        socket.join(rooms.agentRoom(agentId))
        if (conversationId) {
          await conversationService.getConversationById(user.userId, conversationId)
          await rooms.joinConversation(socket.id, conversationId)
          socket.join(rooms.conversationRoom(conversationId))
        }

        server.to(rooms.agentRoom(agentId)).emit('agent:joined', {
          agentId,
          conversationId: conversationId || null,
        })

        return ack?.(null, { success: true })
      } catch (err: any) {
        return ack?.({ error: err?.message || 'Agent join failed' })
      }
    })

    // Connection recovery — client requests to rejoin rooms after reconnect
    socket.on('recover', async (payload: { conversationIds?: string[] }, ack: Function) => {
      try {
        const { conversationIds = [] } = payload || {}
        const rejoined: string[] = []
        for (const cid of conversationIds) {
          try {
            await conversationService.getConversationById(user.userId, cid)
            await rooms.joinConversation(socket.id, cid)
            socket.join(rooms.conversationRoom(cid))
            rejoined.push(cid)
          } catch (_) {
            // skip invalid rooms silently
          }
        }
        return ack?.(null, { rejoined })
      } catch (err: any) {
        return ack?.({ error: err?.message || 'Recover failed' })
      }
    })
  })

  io = server

  const listenPort = port || Number(process.env.PORT) || 6000
  httpServer.listen(listenPort)
  return server
}

export function getIo() {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}
