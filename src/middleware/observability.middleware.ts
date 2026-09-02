import crypto from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { prisma } from '../config/prisma'
import { logger } from '../infrastructure/logger'
import { requestsTotal, requestDuration } from '../infrastructure/metrics'

export const requestObservability = (req: Request, res: Response, next: NextFunction) => {
  const started = process.hrtime.bigint()
  const correlationId = req.header('x-correlation-id') || crypto.randomUUID()
  res.setHeader('x-correlation-id', correlationId)
  res.on('finish', () => {
    const responseTime = Number((process.hrtime.bigint() - started) / BigInt(1_000_000))
    logger.info({ event: 'http_request', correlationId, method: req.method, path: req.path, statusCode: res.statusCode, responseTime }, 'HTTP request completed')
    requestsTotal.inc({ method: req.method, route: req.route?.path || req.path, status: String(res.statusCode) })
    requestDuration.observe({ method: req.method, route: req.route?.path || req.path }, responseTime / 1000)
    void prisma.requestLog.create({ data: { correlationId, method: req.method, path: req.path, statusCode: res.statusCode, responseTime, userId: req.userId ?? null, companyId: req.companyId ?? req.user?.companyId ?? null } }).catch(() => undefined)
  })
  next()
}
