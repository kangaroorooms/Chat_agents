import AuthConfig from '../../config/auth'
import jwt, { Secret } from 'jsonwebtoken'

export type JwtPayload = {
  userId: string
  role?: UserRole
  companyId?: string
}

export type UserRole = 'CUSTOMER' | 'AGENT' | 'ADMIN' | 'SUPER_ADMIN'

class TokenService {
  private getSecret(): Secret {
    if (!AuthConfig.jwt.secret || AuthConfig.jwt.secret === 'change-this-secret') {
      throw new Error('JWT_SECRET is required for token signing and verification')
    }
    return AuthConfig.jwt.secret
  }

  sign(payload: JwtPayload) {
    const options: jwt.SignOptions = {
      expiresIn: AuthConfig.jwt.expiresIn as jwt.SignOptions['expiresIn'],
      algorithm: AuthConfig.jwt.algorithm as jwt.Algorithm,
      issuer: AuthConfig.jwt.issuer,
      audience: AuthConfig.jwt.audience,
    }

    return jwt.sign(payload, this.getSecret(), options)
  }

  verify<T extends object = any>(token: string): T {
    return jwt.verify(token, this.getSecret()) as T
  }
}

export default new TokenService()
