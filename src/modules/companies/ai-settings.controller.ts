import { Request, Response } from 'express'
import { aiSettingsService } from './ai-settings.service'
import { CreateAISettingsSchema, UpdateAISettingsSchema } from './ai-settings.dto'
import { auditLogService } from '../audit/audit.service'

export const getAISettings = async (req: Request, res: Response) => {
  try {
    const companyId = String(req.params.companyId)
    const settings = await aiSettingsService.get(companyId)
    return res.json({ success: true, data: settings })
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Unable to get AI settings' })
  }
}

export const createAISettings = async (req: Request, res: Response) => {
  try {
    const parsed = CreateAISettingsSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid payload', details: parsed.error.format() })

    const companyId = String(req.params.companyId)
    const settings = await aiSettingsService.create(companyId, parsed.data)
    await auditLogService.log(companyId, 'AI_SETTINGS_CHANGED', 'ai_settings', settings.id, req.userId)
    return res.status(201).json({ success: true, data: settings })
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Unable to create AI settings' })
  }
}

export const updateAISettings = async (req: Request, res: Response) => {
  try {
    const parsed = UpdateAISettingsSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid payload', details: parsed.error.format() })

    const companyId = String(req.params.companyId)
    const settings = await aiSettingsService.update(companyId, parsed.data)
    await auditLogService.log(companyId, 'AI_SETTINGS_CHANGED', 'ai_settings', settings.id, req.userId)
    return res.json({ success: true, data: settings })
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Unable to update AI settings' })
  }
}
