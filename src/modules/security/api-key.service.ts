import { prisma } from '../../config/prisma'
import crypto from 'crypto'
import { auditLogService } from '../audit/audit.service'

export class ApiKeyService {
  /**
   * Generate new API key
   */
  async createKey(companyId: string, name: string, scopes: string[] = [], expiresAt?: Date): Promise<{ id: string; key: string }> {
    const key = `sk_${crypto.randomBytes(24).toString('hex')}`
    const keyHash = crypto.createHash('sha256').update(key).digest('hex')

    const record = await (prisma as any).companyApiKey.create({
      data: {
        companyId,
        name,
        keyHash,
        scopes,
        expiresAt,
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
  async verifyKey(key: string): Promise<{ companyId: string; scopes: string[] } | null> {
    const keyHash = crypto.createHash('sha256').update(key).digest('hex')
    
    const record = await (prisma as any).companyApiKey.findUnique({
      where: { keyHash },
    })

    const expected = Buffer.from(keyHash, 'utf8')
    const stored = record ? Buffer.from(record.keyHash, 'utf8') : Buffer.alloc(expected.length)
    const matches = stored.length === expected.length && crypto.timingSafeEqual(stored, expected)
    if (!record || !matches || record.revokedAt) {
      return null
    }

    if (record.expiresAt && record.expiresAt <= new Date()) return null

    // Update last used
    await (prisma as any).companyApiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    })

    return { companyId: record.companyId, scopes: record.scopes || [] }
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
        expiresAt: true,
        scopes: true,
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

  async rotateKey(companyId: string, keyId: string, name: string, scopes: string[] = [], expiresAt?: Date) {
    const current = await (prisma as any).companyApiKey.findFirst({ where: { id: keyId, companyId, revokedAt: null } })
    if (!current) throw new Error('API key not found')
    const replacement = await this.createKey(companyId, name, scopes, expiresAt)
    await (prisma as any).companyApiKey.update({ where: { id: current.id }, data: { revokedAt: new Date(), rotatedAt: new Date() } })
    await auditLogService.log(companyId, 'API_KEY_CREATED' as any, 'api_key', replacement.id, undefined, { rotatedFrom: current.id })
    return replacement
  }
}

export const apiKeyService = new ApiKeyService()
