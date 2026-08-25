import { Request, Response, NextFunction } from 'express'

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Zod validation errors have a `errors` property when formatted
  if (typeof err === 'object' && err !== null && 'errors' in err) {
    // @ts-ignore
    return res.status(400).json({ message: 'Validation failed', details: err })
  }

  if (err instanceof Error) {
    return res.status(500).json({ message: err.message })
  }

  return res.status(500).json({ message: 'Unknown error' })
}
