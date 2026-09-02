import { prisma } from "../../config/prisma";
import { conversationWorkflowService } from "./conversation.workflow";
import { z } from 'zod'
import type { ConversationState } from '@prisma/client'

// Use the generated Prisma client directly for strong typing
const db = prisma

export class ConversationService {
  private async resolveParticipant(participantId: string, companyId?: string) {
    const trimmed = participantId.trim()
    if (!trimmed) return null

    if (z.string().uuid().safeParse(trimmed).success) {
      return prisma.user.findUnique({
        where: {
          id: trimmed,
          ...(companyId ? { companyId } : {}),
        },
      })
    }

    return prisma.user.findUnique({
      where: {
        email: trimmed,
        ...(companyId ? { companyId } : {}),
      },
    })
  }

  async createConversation(
    currentUserId: string,
    participantId: string,
    companyId?: string
  ) {
    const participant = await this.resolveParticipant(participantId, companyId)

    if (!participant) {
      throw new Error("Participant not found");
    }

    if (!['AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(participant.role)) {
      throw new Error('Participant must be a support user')
    }

    if (currentUserId === participant.id) {
      throw new Error(
        "Cannot create conversation with yourself"
      );
    }

    // Check if conversation already exists
    const existingConversation =
    await db.conversation.findFirst({
      where: {
        AND: [
          {
            participants: {
              some: {
                userId: currentUserId,
              },
            },
          },
          {
            participants: {
              some: {
                userId: participantId,
              },
            },
          },
        ],
      },
      include: {
        participants: true,
      },
    });

if (
  existingConversation &&
  existingConversation.participants.length === 2
) {
  return existingConversation;
}

    const conversation =
      await db.conversation.create({
        data: {
          companyId,
          participants: {
            create: [
              {
                userId: currentUserId,
              },
              {
                userId: participantId,
              },
            ],
          },
        },
        include: {
          participants: true,
        },
      });

    return conversation;
  }

  async getConversations(currentUserId: string, companyId?: string) {
    return db.conversation.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        participants: {
          some: {
            userId: currentUserId,
          },
        },
      },
      include: {
        owner: { select: { id: true, username: true, email: true } },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
  
  async deleteConversation(
    userId: string,
    conversationId: string,
    companyId?: string
  ) {
    const conversation =
      await db.conversation.findFirst({
        where: {
          id: conversationId,
          ...(companyId ? { companyId } : {}),
          participants: {
            some: {
              userId,
            },
          },
        },
      });
  
    if (!conversation) {
      throw new Error(
        "Conversation not found"
      );
    }
  
    // Soft delete
    await db.conversation.update({
      where: { id: conversationId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  
    return {
      success: true,
    };
  }

  async listConversations(
    userId: string,
    opts: { limit?: number; cursor?: string; search?: string; state?: string; companyId?: string } = {}
  ) {
    const limit = opts.limit || 20

    const where: any = {
      isDeleted: false,
      participants: { some: { userId } },
      ...(opts.companyId ? { companyId: opts.companyId } : {}),
    }

    if (opts.state) where.state = opts.state

    if (opts.search) {
      where.OR = [
        { title: { contains: opts.search, mode: 'insensitive' } },
        {
          participants: {
            some: {
              user: {
                username: { contains: opts.search, mode: 'insensitive' },
              },
            },
          },
        },
      ]
    }

    // cursor-based pagination
    const take = opts.limit || 20
    const findArgs: any = {
      where,
      include: {
        owner: { select: { id: true, username: true, email: true } },
        participants: {
          include: { user: { select: { id: true, username: true, email: true } } },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take,
    }
    if (opts.cursor) {
      findArgs.cursor = { id: opts.cursor }
      findArgs.skip = 1
    }

    const [items, total] = await Promise.all([
      db.conversation.findMany(findArgs),
      db.conversation.count({ where }),
    ])

    const nextCursor = items.length === take ? items[items.length - 1].id : null
    return { items, pagination: { nextCursor, pageSize: limit, total } }
  }

  async listAgentQueue(
    userId: string,
    opts: { limit?: number; cursor?: string; search?: string; companyId?: string } = {}
  ) {
    const limit = opts.limit || 20

    const where: any = {
      isDeleted: false,
      AND: [
        { state: { notIn: ['CLOSED', 'ARCHIVED'] } },
        {
          OR: [
            { ownerId: userId },
            {
              AND: [
                { ownerId: null },
                { state: 'OPEN' },
                { queueState: { in: ['NEW', 'ESCALATED'] } },
              ],
            },
          ],
        },
      ],
    }

    if (opts.search) {
      where.AND.push({
        OR: [
          { title: { contains: opts.search, mode: 'insensitive' } },
          {
            participants: {
              some: {
                user: {
                  username: { contains: opts.search, mode: 'insensitive' },
                },
              },
            },
          },
        ],
      })
    }

    if (opts.companyId) {
      where.AND.push({ companyId: opts.companyId })
    }

    const take = opts.limit || 20
    const findArgs: any = {
      where,
      include: {
        owner: { select: { id: true, username: true, email: true } },
        assignedBy: { select: { id: true, username: true, email: true } },
        participants: {
          include: { user: { select: { id: true, username: true, email: true, role: true } } },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take,
    }
    if (opts.cursor) {
      findArgs.cursor = { id: opts.cursor }
      findArgs.skip = 1
    }

    const [items, total] = await Promise.all([
      db.conversation.findMany(findArgs),
      db.conversation.count({ where }),
    ])

    const nextCursor = items.length === take ? items[items.length - 1].id : null
    return { items, pagination: { nextCursor, pageSize: limit, total } }
  }

  async getConversationById(userId: string, conversationId: string) {
    const conversation = await db.conversation.findFirst({
      where: { id: conversationId, isDeleted: false, participants: { some: { userId } } },
      include: {
        owner: { select: { id: true, username: true, email: true } },
        assignedBy: { select: { id: true, username: true, email: true } },
        participants: { include: { user: { select: { id: true, username: true, email: true } } } },
        messages: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          include: { sender: { select: { id: true, username: true, email: true } } },
        },
      },
    })

    if (!conversation) throw new Error('Conversation not found')
    return conversation
  }

  async changeState(userId: string, conversationId: string, state: ConversationState) {
    // ensure participant
    const conv = await db.conversation.findFirst({ where: { id: conversationId, participants: { some: { userId } } } })
    if (!conv) throw new Error('Conversation not found')
    const updated = await db.conversation.update({ where: { id: conversationId }, data: { state } })
    return updated
  }

  async addParticipant(userId: string, conversationId: string, participantId: string, companyId?: string) {
    // ensure requester is participant
    const conv = await db.conversation.findFirst({ where: { id: conversationId, participants: { some: { userId } } } })
    if (!conv) throw new Error('Conversation not found')

    // check participant exists
    const user = await db.user.findFirst({ where: { id: participantId, ...(companyId ? { companyId } : {}) } })
    if (!user) throw new Error('Participant user not found')

    // create relation if not exists
    try {
      await db.conversationParticipant.create({ data: { conversationId, userId: participantId } })
    } catch (e) {
      // ignore unique constraint errors
    }

    return { success: true }
  }

  async removeParticipant(userId: string, conversationId: string, participantId: string, companyId?: string) {
    // ensure requester is participant
    const conv = await db.conversation.findFirst({ where: { id: conversationId, participants: { some: { userId } } } })
    if (!conv) throw new Error('Conversation not found')

    await db.conversationParticipant.deleteMany({ where: { conversationId, userId: participantId } })
    return { success: true }
  }

  async assignOwner(userId: string, conversationId: string, ownerId: string, companyId?: string) {
    const conv = await db.conversation.findFirst({ where: { id: conversationId, ...(companyId ? { companyId } : {}), participants: { some: { userId } } } })
    if (!conv) throw new Error('Conversation not found')

    const target = await db.user.findFirst({ where: { id: ownerId, ...(companyId ? { companyId } : {}) } })
    if (!target) throw new Error('Target agent not found')
    if (!['AGENT', 'ADMIN', 'SUPER_ADMIN'].includes(target.role)) throw new Error('Target user is not an agent')

    const queueState = conv.ownerId && conv.ownerId !== ownerId ? 'TRANSFERRED' : 'ASSIGNED'

    await db.conversation.update({
      where: { id: conversationId },
      data: {
        ownerId,
        queueState,
        assignedAt: new Date(),
        assignedById: userId,
      },
    })
    return { success: true }
  }
}

export const conversationService = new ConversationService()