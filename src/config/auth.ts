import dotenv from 'dotenv'

dotenv.config()

type SameSite = 'lax' | 'strict' | 'none'

const toBool = (v?: string, d = false) => (v ? v === 'true' : d)
const toString = (v?: string, d = '') => (v?.trim() ? v.trim() : d)

export const AuthConfig = {
  jwt: {
    secret: toString(process.env.JWT_SECRET, 'change-this-secret'),
    expiresIn: toString(process.env.ACCESS_TOKEN_EXPIRES_IN, '15m'),
    algorithm: toString(process.env.JWT_ALGORITHM, 'HS256'),
    issuer: toString(process.env.JWT_ISSUER, 'chatbot-app'),
    audience: toString(process.env.JWT_AUDIENCE, 'chatbot-app-users'),
  },
  refreshToken: {
    ttlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30),
    cookieName: toString(process.env.REFRESH_TOKEN_COOKIE_NAME, 'refreshToken'),
  },
  cookie: {
    httpOnly: true,
    secure: toBool(process.env.COOKIE_SECURE, process.env.NODE_ENV === 'production'),
    sameSite: (process.env.COOKIE_SAMESITE as SameSite) || 'lax',
    domain: toString(process.env.COOKIE_DOMAIN, ''),
    path: toString(process.env.COOKIE_PATH, '/'),
  },
  security: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    enforceOriginCheck: toBool(process.env.ENFORCE_ORIGIN_CHECK, false),
  },
  auth: {
    saltRounds: Number(process.env.SALT_ROUNDS || 10),
  },
}

export default AuthConfig
