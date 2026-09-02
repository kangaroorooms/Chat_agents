import rateLimit from 'express-rate-limit'

const limiter = (max: number) => rateLimit({
  windowMs: 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Rate limit exceeded' },
})

export const globalLimiter = limiter(100)
export const widgetLimiter = limiter(30)
export const authLimiter = limiter(10)
export const webhookLimiter = limiter(200)