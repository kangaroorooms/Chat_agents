import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token', '*.apiKey', '*.secret'],
    censor: '[REDACTED]',
  },
  base: { service: process.env.SERVICE_NAME || 'chatbot-api' },
})