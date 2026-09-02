import { prisma } from '../../config/prisma'
import PasswordService from '../auth/password.service'
import refreshTokenService from '../auth/refreshToken.service'
import type { CreateUserDto, UpdateUserDto, ListUsersQueryDto } from './user.dto'
import { billingService } from '../billing/billing.service'
import { usageService } from '../billing/usage.service'
import { identityService } from '../security/identity.service'

export class UserService {
  async getMe(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        companyId: true,
        isActive: true,
        createdAt: true,
      },
    })
  }

  async getUsers(currentUserId: string, query: ListUsersQueryDto, companyId?: string) {
    const take = Math.min(Math.max(query.limit ?? 50, 1), 100)
    const search = query.search?.trim()

    return prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        ...(companyId ? { companyId } : {}),
        ...(query.role ? { role: query.role } : {}),
        ...(search
          ? {
              OR: [
                { username: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        companyId: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { username: 'asc' },
      take: take + 1,
      ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
    })
  }

  async getUserById(userId: string, companyId?: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, ...(companyId ? { companyId } : {}) },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        companyId: true,
        isActive: true,
        createdAt: true,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    return user
  }

  async createUser(payload: CreateUserDto) {
    try {
      if (payload.role === 'AGENT' && payload.companyId && !(await billingService.checkPlanLimits(payload.companyId, 'agents'))) throw new Error('Agent limit reached for this subscription')
      if (payload.companyId) await identityService.validateCredentials(payload.companyId, payload.email, payload.password)
      const hashedPassword = await PasswordService.hash(payload.password)

      const user = await prisma.user.create({
        data: {
          username: payload.username,
          email: payload.email,
          password: hashedPassword,
          role: payload.role,
          companyId: payload.companyId ?? null,
          isActive: payload.isActive ?? true,
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          companyId: true,
          isActive: true,
          createdAt: true,
        },
      })
      if (user.role === 'AGENT' && user.companyId) void usageService.record(user.companyId, 'agents', 1, { userId: user.id }).catch(() => undefined)

      return user
    } catch (err: any) {
      const message = err?.message || String(err)
      if (message.includes('Unique constraint failed')) {
        throw new Error('Username or email already exists')
      }
      throw new Error(`Unable to create user: ${message}`)
    }
  }

  async updateUser(userId: string, payload: UpdateUserDto, companyId?: string) {
    const data: Record<string, unknown> = {}
    const current = await prisma.user.findFirst({ where: { id: userId, ...(companyId ? { companyId } : {}) }, select: { companyId: true } })

    if (payload.username !== undefined) data.username = payload.username
    if (payload.email !== undefined) data.email = payload.email
    if (payload.role !== undefined) data.role = payload.role
    if (payload.companyId !== undefined) data.companyId = payload.companyId
    if (payload.isActive !== undefined) data.isActive = payload.isActive
    if (payload.password !== undefined) {
      if (current?.companyId) await identityService.validateCredentials(current.companyId, undefined, payload.password)
      data.password = await PasswordService.hash(payload.password)
    }

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          companyId: true,
          isActive: true,
          createdAt: true,
        },
      })

      if (payload.isActive === false) {
        await refreshTokenService.revokeAllForUser(userId)
      }

      return user
    } catch (err: any) {
      const message = err?.message || String(err)
      if (message.includes('Record to update not found')) {
        throw new Error('User not found')
      }
      if (message.includes('Unique constraint failed')) {
        throw new Error('Username or email already exists')
      }
      throw new Error(`Unable to update user: ${message}`)
    }
  }

  async deleteUser(userId: string, companyId?: string) {
    try {
      await refreshTokenService.revokeAllForUser(userId)
      const result = await prisma.user.deleteMany({ where: { id: userId, ...(companyId ? { companyId } : {}) } })
      if (!result.count) throw new Error('Record to delete does not exist')
      return { success: true }
    } catch (err: any) {
      const message = err?.message || String(err)
      if (message.includes('Record to delete does not exist')) {
        throw new Error('User not found')
      }
      throw new Error(`Unable to delete user: ${message}`)
    }
  }

  async searchAgents(currentUserId: string, query?: string, cursor?: string, limit = 20, companyId?: string) {
    const search = query?.trim()
    const take = Math.min(Math.max(limit, 1), 50)
    const items = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        ...(companyId ? { companyId } : {}),
        role: 'AGENT',
        ...(search
          ? {
              OR: [
                { username: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        username: true,
        email: true,
      },
      orderBy: { username: 'asc' },
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })

    const hasNext = items.length > take
    const visibleItems = hasNext ? items.slice(0, take) : items
    return {
      items: visibleItems,
      pagination: { nextCursor: hasNext ? visibleItems[visibleItems.length - 1]?.id ?? null : null },
    }
  }
}
