import { CookieOptions } from 'express'
import AuthConfig from '../../config/auth'

class CookieService {
  getRefreshCookieName(): string {
    return AuthConfig.refreshToken.cookieName
  }

  getRefreshCookieOptions(): CookieOptions {
    const ttl = AuthConfig.refreshToken.ttlDays * 24 * 60 * 60 * 1000
    return {
      httpOnly: AuthConfig.cookie.httpOnly,
      secure: AuthConfig.cookie.secure,
      sameSite: AuthConfig.cookie.sameSite,
      domain: AuthConfig.cookie.domain,
      path: AuthConfig.cookie.path,
      maxAge: ttl,
    }
  }

  clearRefreshCookieOptions(): CookieOptions {
    return {
      path: AuthConfig.cookie.path,
      domain: AuthConfig.cookie.domain,
    }
  }
}

export default new CookieService()
