import { prisma } from '../config/prisma'

export class TenantAccessError extends Error {
  readonly statusCode = 404
  constructor() {
    super('Resource not found')
  }
}

export async function assertConversationAccess(companyId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, companyId } })
  if (!conversation) throw new TenantAccessError()
  return conversation
}

export async function assertMessageAccess(companyId: string, messageId: string) {
  const message = await prisma.message.findFirst({ where: { id: messageId, companyId } })
  if (!message) throw new TenantAccessError()
  return message
}

export async function assertKnowledgeAccess(companyId: string, documentId: string) {
  const document = await prisma.knowledgeDocument.findFirst({ where: { id: documentId, companyId } })
  if (!document) throw new TenantAccessError()
  return document
}

export async function assertUserAccess(companyId: string, userId: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, companyId } })
  if (!user) throw new TenantAccessError()
  return user
}
