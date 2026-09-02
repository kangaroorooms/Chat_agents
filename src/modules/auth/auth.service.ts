import { prisma } from '../../config/prisma'
import PasswordService from './password.service'
import TokenService from './token.service'
import { identityService } from '../security/identity.service'

export class AuthService {
  async register(
    username: string,
    email: string,
    password: string
  ) {
    try {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      })

      if (existingUser) {
        throw new Error('User already exists')
      }

      const hashedPassword = await PasswordService.hash(password)

      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
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

      return user
    } catch (err: any) {
      const message = err?.message || String(err)
      throw new Error(`Database error during register: ${message}`)
    }
  }

  async login(email: string, password: string, mfaToken?: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      })

      if (!user) {
        throw new Error('Invalid credentials')
      }

      const validPassword = await PasswordService.compare(password, user.password)

      if (!validPassword) {
        throw new Error('Invalid credentials')
      }

      if (!user.isActive) {
        throw new Error('Account inactive')
      }
      if (user.mfaEnabled && (!mfaToken || !(await identityService.verifyMfa(user.id, mfaToken)))) throw new Error('MFA required')

      const payload: { userId: string; role?: string; companyId?: string } = { userId: user.id }
      if (user.role) payload.role = user.role
      if (user.companyId) payload.companyId = user.companyId

      const accessToken = TokenService.sign(payload as unknown as import('./token.service').JwtPayload)

      return {
        token: accessToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      }
    } catch (err: any) {
      const message = err?.message || String(err)
      if (message === 'Invalid credentials') throw new Error('Invalid credentials')
      if (message === 'Account inactive') throw new Error('Account inactive')
      throw new Error(`Database error during login: ${message}`)
    }
  }
}
