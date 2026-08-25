import { prisma } from '../../config/prisma'
import { domainEventBus } from '../events/domain-event-bus'
import type { CreateCompanyDto, UpdateCompanyDto } from './company.dto'
import { auditLogService } from '../audit/audit.service'

export class CompanyService {
  async listCompanies() {
    return prisma.company.findMany({
      orderBy: { name: 'asc' },
    })
  }

  async getCompanyById(companyId: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    })

    if (!company) {
      throw new Error('Company not found')
    }

    return company
  }

  async createCompany(payload: CreateCompanyDto, performedById: string) {
    const company = await prisma.company.create({
      data: {
        name: payload.name,
        slug: payload.slug,
        logoUrl: (payload as any).logoUrl ?? null,
        primaryColor: (payload as any).primaryColor ?? undefined,
        widgetWelcomeMessage: (payload as any).widgetWelcomeMessage ?? null,
        status: (payload as any).status ?? undefined,
      },
    })

    domainEventBus.emit('company.created', {
      companyId: company.id,
      performedById,
      company,
    })
    await auditLogService.log(company.id, 'COMPANY_UPDATED', 'company', company.id, performedById, { operation: 'created' })

    return company
  }

  async updateCompany(companyId: string, payload: UpdateCompanyDto, performedById: string) {
    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        name: payload.name,
        slug: (payload as any).slug ?? undefined,
        logoUrl: (payload as any).logoUrl ?? undefined,
        primaryColor: (payload as any).primaryColor ?? undefined,
        widgetWelcomeMessage: (payload as any).widgetWelcomeMessage ?? undefined,
        status: (payload as any).status ?? undefined,
      },
    })
    await auditLogService.log(company.id, 'COMPANY_UPDATED', 'company', company.id, performedById)

    domainEventBus.emit('company.updated', {
      companyId: company.id,
      performedById,
      company,
    })

    return company
  }

  async deleteCompany(companyId: string, performedById: string) {
    const company = await prisma.company.delete({
      where: { id: companyId },
    })

    domainEventBus.emit('company.deleted', {
      companyId: company.id,
      performedById,
      company,
    })

    return company
  }
}

export const companyService = new CompanyService()
