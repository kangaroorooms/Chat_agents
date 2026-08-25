import { prisma } from '../../../config/prisma'
import { v4 as uuid } from 'uuid'

interface WidgetConversationRequest {
  visitorId?: string
  visitorName?: string
  visitorEmail?: string
  companyId: string
}

export class WidgetService {
  /**
   * Create or retrieve visitor session
   */
  async getOrCreateVisitor(companyId: string, sessionId?: string): Promise<any> {
    const id = sessionId || uuid()
    
    let visitor = await (prisma as any).widgetVisitor.findUnique({
      where: { sessionId: id },
    })

    if (!visitor) {
      visitor = await (prisma as any).widgetVisitor.create({
        data: {
          companyId,
          sessionId: id,
        },
      })
    }

    return visitor
  }

  /**
   * Update visitor information
   */
  async updateVisitor(sessionId: string, data: { name?: string; email?: string }): Promise<any> {
    return (prisma as any).widgetVisitor.update({
      where: { sessionId },
      data,
    })
  }

  /**
   * Start conversation from widget
   */
  async startConversation(companyId: string, visitorId: string, visitorName?: string, visitorEmail?: string): Promise<any> {
    const conversation = await (prisma as any).conversation.create({
      data: {
        companyId,
        title: `Widget Conversation - ${visitorName || 'Anonymous'} (${new Date().toLocaleString()})`,
        state: 'OPEN',
        queueState: 'NEW',
        metadata: {
          visitorId,
          visitorName,
          visitorEmail,
          isWidget: true,
        },
      },
    })

    return conversation
  }

  /**
   * Send message in widget conversation
   */
  async sendMessage(conversationId: string, content: string, senderType: 'visitor' | 'system'): Promise<any> {
    // Create a system message or visitor message
    const systemUserId = 'widget-system-user'

    const message = await (prisma as any).message.create({
      data: {
        conversationId,
        content,
        type: 'TEXT',
        senderId: systemUserId,
        metadata: {
          senderType,
          isWidgetMessage: true,
        },
      },
    })

    return message
  }

  /**
   * Get messages for widget conversation
   */
  async getMessages(conversationId: string, limit: number = 50): Promise<any[]> {
    return (prisma as any).message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        content: true,
        type: true,
        metadata: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })
  }
}

export const widgetService = new WidgetService()
