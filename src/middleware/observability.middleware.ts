import crypto from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { prisma } from '../config/prisma'

export const requestObservability = (req: Request, res: Response, next: NextFunction) => {
  const started = process.hrtime.bigint()
  const correlationId = req.header('x-correlation-id') || crypto.randomUUID()
  res.setHeader('x-correlation-id', correlationId)
  res.on('finish', () => {
    const responseTime = Number((process.hrtime.bigint() - started) / BigInt(1_000_000))
    console.info(JSON.stringify({ event: 'http_request', correlationId, method: req.method, path: req.path, statusCode: res.statusCode, responseTime }))
    void prisma.requestLog.create({ data: { correlationId, method: req.method, path: req.path, statusCode: res.statusCode, responseTime, userId: req.userId ?? null, companyId: req.companyId ?? req.user?.companyId ?? null } }).catch(() => undefined)
  })
  next()
}
