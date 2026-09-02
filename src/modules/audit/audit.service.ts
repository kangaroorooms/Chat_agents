import { prisma } from '../../config/prisma'
import type { AuditAction } from '@prisma/client'

export class AuditLogService {
  /**
   * Log an audit event
   */
  async log(
    companyId: string | null | undefined,
    action: AuditAction,
    resourceType: string,
    resourceId: string,
    userId?: string,
    metadata?: any
  ): Promise<any> {
    return (prisma as any).auditLog.create({
      data: {
        companyId,
        userId: userId || null,
        action,
        resourceType,
        resourceId,
        metadata,
      },
    })
  }

  /**
   * Get audit logs for company
   */
  async getCompanyLogs(
    companyId: string,
    options: { limit?: number; offset?: number; action?: AuditAction } = {}
  ): Promise<any[]> {
    return (prisma as any).auditLog.findMany({
      where: {
        companyId,
        action: options.action,
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0,
    })
  }

  /**
   * Get single audit log
   */
  async getLog(id: string): Promise<any> {
    return (prisma as any).auditLog.findUnique({ where: { id } })
  }
}

export const auditLogService = new AuditLogService()
