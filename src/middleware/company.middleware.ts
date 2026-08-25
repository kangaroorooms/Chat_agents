import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'

export const requireCompanyContext = async (req: Request, res: Response, next: NextFunction) => {
  // prefer companyId from authenticated token
  const tokenCompany = req.user?.companyId
  if (tokenCompany) {
    req.companyId = tokenCompany
    return next()
  }

  // fallback: lookup user in DB
  const userId = req.userId
  if (!userId) return res.status(403).json({ success: false, message: 'Company context required' })

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } })
  if (!user || !user.companyId) return res.status(403).json({ success: false, message: 'Company context required' })

  req.companyId = user.companyId
  return next()
}

export default requireCompanyContext
