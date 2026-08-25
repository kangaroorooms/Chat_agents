import { prisma } from '../../config/prisma'
import type { CreateAISettingsDto, UpdateAISettingsDto } from './ai-settings.dto'

export class AISettingsService {
  async get(companyId: string) {
    return (prisma as any).aiSettings.findUnique({ where: { companyId } })
  }

  async create(companyId: string, payload: CreateAISettingsDto) {
    return (prisma as any).aiSettings.upsert({ where: { companyId }, create: { companyId, ...payload }, update: { ...payload } })
  }

  async update(companyId: string, payload: UpdateAISettingsDto) {
    return (prisma as any).aiSettings.upsert({ where: { companyId }, create: { companyId, ...payload }, update: { ...payload } })
  }
}

export const aiSettingsService = new AISettingsService()
