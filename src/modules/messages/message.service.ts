import { prisma } from '../../config/prisma'
import type { MessageType } from '@prisma/client'
import { emailService } from '../email/email.service'
import { usageService } from '../billing/usage.service'

const db = prisma

export class MessageService {
  async createMessage(currentUserId: string, payload: { conversationId: string; content?: string; type?: MessageType; metadata?: any; replyToId?: string }) {
    const { conversationId, content, type = 'TEXT', metadata, replyToId } = payload

    // ensure conversation exists and user is participant
    const conv = await db.conversation.findFirst({ where: { id: conversationId, isDeleted: false, participants: { some: { userId: currentUserId } } } })
    if (!conv) throw new Error('Conversation not found')
    if (conv.state === 'CLOSED' || conv.state === 'ARCHIVED') {
      throw new Error('Cannot add messages to closed or archived conversations')
    }

    if (replyToId) {
      const reply = await db.message.findUnique({ where: { id: replyToId } })
      if (!reply || reply.conversationId !== conversationId) throw new Error('Invalid reply target')
    }

    const recipients = await db.conversationParticipant.findMany({ where: { conversationId, userId: { not: currentUserId } }, select: { userId: true } })

    const message = await db.$transaction(async (tx) => {
      const createdMessage = await tx.message.create({
        data: {
          content: content || '',
          type,
          metadata,
          senderId: currentUserId,
          conversationId,
          companyId: conv.companyId ?? undefined,
          replyToId,
        } as any,
        include: {
          sender: {
            select: { id: true, username: true, email: true },
          },
        },
      } as any)

      if (recipients.length > 0) {
        await tx.messageReceipt.createMany({
          data: recipients.map(({ userId }) => ({ messageId: createdMessage.id, userId })),
        })
      }

      await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date(), unreadCount: { increment: 1 } } })

      return createdMessage
    })

    void emailService.sendReply(conversationId, message.content).catch((error) => console.error('Email reply delivery failed', error))
    if (conv.companyId) void usageService.record(conv.companyId, 'messages', 1, { conversationId, messageId: message.id }).catch((error) => console.error('Usage write failed', error))
    return message
  }

  async listMessages(userId: string, conversationId: string, opts: { limit?: number; cursor?: string } = {}) {
    const take = opts.limit || 50
    const where = { conversationId, isDeleted: false }

    const findArgs: any = {
      where,
      include: { sender: { select: { id: true, username: true, email: true } }, edits: { include: { editor: { select: { id: true, username: true } } } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
    }
    if (opts.cursor) {
      findArgs.cursor = { id: opts.cursor }
      findArgs.skip = 1
    }

    const [items, total] = await Promise.all([
      db.message.findMany(findArgs),
      db.message.count({ where }),
    ])

    const nextCursor = items.length === take ? items[items.length - 1].id : null
    return { items, pagination: { nextCursor, pageSize: take, total } }
  }

  async getMessageById(userId: string, messageId: string) {
    const message = await db.message.findUnique({ where: { id: messageId }, include: { sender: true, edits: true } })
    if (!message) throw new Error('Message not found')
    // ensure user is participant of the conversation
    const conv = await db.conversation.findFirst({ where: { id: message.conversationId, participants: { some: { userId } } } })
    if (!conv) throw new Error('Not found')
    return message
  }

  async editMessage(userId: string, messageId: string, content: string, metadata?: any) {
    const message = await db.message.findUnique({ where: { id: messageId } })
    if (!message) throw new Error('Message not found')

    const conv = await db.conversation.findUnique({ where: { id: message.conversationId } })
    if (!conv) throw new Error('Conversation not found')

    if (message.senderId !== userId && conv.ownerId !== userId) throw new Error('Forbidden')

    const [edit, updated] = await db.$transaction([
      db.messageEdit.create({ data: { messageId, editorId: userId, content, metadata } }),
      db.message.update({ where: { id: messageId }, data: { content, editedAt: new Date() } }),
    ])

    return updated
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await db.message.findUnique({ where: { id: messageId } })
    if (!message) throw new Error('Message not found')

    const conv = await db.conversation.findUnique({ where: { id: message.conversationId } })
    if (!conv) throw new Error('Conversation not found')

    if (message.senderId !== userId && conv.ownerId !== userId) throw new Error('Forbidden')

    await db.message.update({ where: { id: messageId }, data: { isDeleted: true, deletedAt: new Date() } })
    return { success: true }
  }

  async deliverConversationMessages(userId: string, conversationId: string) {
    const receipts = await db.messageReceipt.findMany({
      where: {
        userId,
        deliveredAt: null,
        message: { conversationId, senderId: { not: userId }, isDeleted: false },
      },
      include: { message: true },
    })

    if (receipts.length === 0) return []

    const receiptIds = receipts.map((receipt) => receipt.id)
    await db.messageReceipt.updateMany({ where: { id: { in: receiptIds } }, data: { deliveredAt: new Date() } })

    return receipts.map((receipt) => ({
      messageId: receipt.messageId,
      conversationId: receipt.message.conversationId,
      senderId: receipt.message.senderId,
    }))
  }

  async markMessageDelivered(userId: string, messageId: string) {
    const receipt = await db.messageReceipt.findUnique({
      where: { messageId_userId: { messageId, userId } },
      include: { message: true },
    })

    if (!receipt) throw new Error('Message receipt not found')
    if (receipt.deliveredAt) return receipt

    return db.messageReceipt.update({
      where: { id: receipt.id },
      data: { deliveredAt: new Date() },
      include: { message: true },
    })
  }

  async markMessageRead(userId: string, messageId: string) {
    const receipt = await db.messageReceipt.findUnique({
      where: { messageId_userId: { messageId, userId } },
      include: { message: true },
    })

    if (!receipt) throw new Error('Message receipt not found')
    if (receipt.readAt) return receipt

    return db.messageReceipt.update({
      where: { id: receipt.id },
      data: { readAt: new Date() },
      include: { message: true },
    })
  }

  async markConversationRead(userId: string, conversationId: string) {
    const result = await db.messageReceipt.updateMany({
      where: {
        userId,
        readAt: null,
        message: { conversationId, senderId: { not: userId }, isDeleted: false },
      },
      data: { readAt: new Date() },
    })

    await db.conversation.update({ where: { id: conversationId }, data: { unreadCount: 0 } })

    return result.count
  }
}

export const messageService = new MessageService()
