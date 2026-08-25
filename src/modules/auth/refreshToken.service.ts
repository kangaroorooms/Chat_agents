import { prisma } from '../../config/prisma'
import type { RefreshToken, User } from '@prisma/client'
import crypto from 'crypto'
import AuthConfig from '../../config/auth'

const DEFAULT_TTL_DAYS = AuthConfig.refreshToken.ttlDays || 30

export class RefreshTokenService {
  hash(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  async create(userId: string, opts: { deviceId?: string; deviceName?: string; ip?: string; ua?: string } = {}) {
    const token = crypto.randomBytes(64).toString('hex')
    const tokenHash = this.hash(token)
    const expiresAt = new Date(Date.now() + DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000)

    const record = await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        deviceId: opts.deviceId,
        deviceName: opts.deviceName,
        ipAddress: opts.ip,
        userAgent: opts.ua,
        expiresAt,
      },
    })

    return { token, expiresAt, id: record.id }
  }

  async findByToken(token: string): Promise<(RefreshToken & { user: User | null }) | null> {
    const tokenHash = this.hash(token)
    const rec = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } })
    return rec
  }

  async markUsed(id: string) {
    return prisma.refreshToken.update({ where: { id }, data: { lastUsedAt: new Date() } })
  }

  async revoke(id: string) {
    return prisma.refreshToken.update({ where: { id }, data: { isRevoked: true, revokedAt: new Date() } })
  }

  async revokeAllForUser(userId: string) {
    return prisma.refreshToken.updateMany({ where: { userId }, data: { isRevoked: true, revokedAt: new Date() } })
  }

  async rotate(oldTokenId: string, userId: string, opts?: { deviceId?: string; deviceName?: string; ip?: string; ua?: string }) {
    await prisma.refreshToken.update({ where: { id: oldTokenId }, data: { isRevoked: true, revokedAt: new Date() } })
    const token = await this.create(userId, opts)
    await prisma.refreshToken.update({ where: { id: oldTokenId }, data: { replacedByTokenId: token.id } })
    return token
  }

  async listSessionsForUser(userId: string) {
    return prisma.refreshToken.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
  }
}

export default new RefreshTokenService()
