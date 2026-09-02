import { Request, Response } from 'express'
import { knowledgeTrainingService } from './knowledge-training.service'
import { enqueue } from '../../../infrastructure/queues'

export const trainDocument = async (req: Request, res: Response) => {
  try {
    const companyIdParam = Array.isArray(req.params.companyId) 
      ? req.params.companyId[0] 
      : req.params.companyId
    const companyId = (companyIdParam || '') as string
    const { documentId } = req.body

    if (!companyId || companyId !== req.companyId || !documentId) {
      return res.status(400).json({
        success: false,
        message: 'companyId and documentId are required',
      })
    }

    // Start training asynchronously
    const jobId = await enqueue({ queue: 'knowledgeTraining', name: 'train', data: { documentId, companyId } })
    if (!jobId) void knowledgeTrainingService.trainDocument(documentId, companyId).catch((err: any) => console.error('Training error:', err))

    return res.status(202).json({
      success: true,
      message: 'Training started',
      data: { documentId, jobId },
    })
  } catch (error) {
    console.error('Train document error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unable to start training',
    })
  }
}

export const getTrainingStatus = async (req: Request, res: Response) => {
  try {
    const documentIdParam = Array.isArray(req.params.documentId) 
      ? req.params.documentId[0] 
      : req.params.documentId
    const documentId = (documentIdParam || '') as string

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: 'documentId is required',
      })
    }

    const status = await knowledgeTrainingService.getTrainingStatus(documentId)
    return res.json({ success: true, data: status })
  } catch (error) {
    console.error('Get training status error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unable to get training status',
    })
  }
}

export const listReadyDocuments = async (req: Request, res: Response) => {
  try {
    const companyId = Array.isArray(req.params.companyId) 
      ? req.params.companyId[0] 
      : req.params.companyId

    if (!companyId || companyId !== req.companyId) {
      return res.status(400).json({
        success: false,
        message: 'companyId is required',
      })
    }

    const documents = await knowledgeTrainingService.listReadyDocuments(companyId)
    return res.json({ success: true, data: documents })
  } catch (error) {
    console.error('List ready documents error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unable to list documents',
    })
  }
}
