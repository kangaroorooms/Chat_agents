import { Request, Response } from 'express'
import { companyService } from './company.service'
import { CreateCompanySchema, UpdateCompanySchema } from './company.dto'

export const listCompanies = async (req: Request, res: Response) => {
  try {
    const companies = await companyService.listCompanies()
    return res.json({ success: true, data: companies })
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Unable to list companies' })
  }
}

export const getCompany = async (req: Request, res: Response) => {
  try {
    const companyId = String(req.params.id)
    const company = await companyService.getCompanyById(companyId)
    return res.json({ success: true, data: company })
  } catch (error) {
    return res.status(404).json({ success: false, message: error instanceof Error ? error.message : 'Company not found' })
  }
}

export const createCompany = async (req: Request, res: Response) => {
  try {
    const parsed = CreateCompanySchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid payload', details: parsed.error.format() })

    const performedById = req.userId ?? ''
    const company = await companyService.createCompany(parsed.data, performedById)
    return res.status(201).json({ success: true, data: company })
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Unable to create company' })
  }
}

export const updateCompany = async (req: Request, res: Response) => {
  try {
    const parsed = UpdateCompanySchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid payload', details: parsed.error.format() })

    const performedById = String(req.userId ?? '')
    const company = await companyService.updateCompany(String(req.params.id), parsed.data, performedById)
    return res.json({ success: true, data: company })
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unable to update company' })
  }
}

export const deleteCompany = async (req: Request, res: Response) => {
  try {
    const performedById = String(req.userId ?? '')
    await companyService.deleteCompany(String(req.params.id), performedById)
    return res.json({ success: true })
  } catch (error) {
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unable to delete company' })
  }
}
