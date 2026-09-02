import { prisma } from '../config/prisma'

const models: Record<string, string> = {
  conversation: 'conversation',
  message: 'message',
  knowledge_document: 'knowledgeDocument',
  webhook: 'webhook',
  api_key: 'companyApiKey',
  user: 'user',
}

export async function assertCompanyResourceOwnership(
  companyId: string,
  resourceType: string,
  resourceId: string,
): Promise<Record<string, unknown>> {
  const modelName = models[resourceType]
  if (!modelName) throw new Error(`Unsupported tenant resource: ${resourceType}`)
  const resource = await (prisma as any)[modelName].findFirst({ where: { id: resourceId, companyId } })
  if (!resource) {
    const error = new Error('Resource not found')
    ;(error as Error & { statusCode?: number }).statusCode = 404
    throw error
  }
  return resource
}