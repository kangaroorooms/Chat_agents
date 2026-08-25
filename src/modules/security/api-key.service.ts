import { prisma } from '../../../config/prisma'
import crypto from 'crypto'

export class ApiKeyService {
  /**
   * Generate new API key
   */
  async createKey(companyId: string, name: string): Promise<{ id: string; key: string }> {
    const key = `sk_${crypto.randomBytes(24).toString('hex')}`
    const keyHash = crypto.createHash('sha256').update(key).digest('hex')

    const record = await (prisma as any).companyApiKey.create({
      data: {
        companyId,
        name,
        keyHash,
      },
    })

    return {
      id: record.id,
      key, // Only return once!
    }
  }

  /**
   * Verify API key
   */
  async verifyKey(key: string): Promise<{ companyId: string } | null> {
    const keyHash = crypto.createHash('sha256').update(key).digest('hex')
    
    const record = await (prisma as any).companyApiKey.findUnique({
      where: { keyHash },
    })

    if (!record || record.revokedAt) {
      return null
    }

    // Update last used
    await (prisma as any).companyApiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    })

    return { companyId: record.companyId }
  }

  /**
   * List API keys
   */
  async listKeys(companyId: string): Promise<any[]> {
    return (prisma as any).companyApiKey.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsedAt: true,
        revokedAt: true,
      },
    })
  }

  /**
   * Revoke API key
   */
  async revokeKey(keyId: string): Promise<any> {
    return (prisma as any).companyApiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    })
  }
}

export const apiKeyService = new ApiKeyService()
