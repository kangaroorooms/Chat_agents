import { getRetrieverService } from '../../knowledge/retriever/retriever.service'
import { getProviderForCompany } from '../provider/factory'

export class AssistantService {
  async generateAnswer(companyId: string, userMessage: string) {
    const retriever = getRetrieverService()
    const docs = await retriever.retrieve({ query: userMessage, companyId, topK: 5 })
    const sources = docs.map((d) => ({ documentId: d.documentId, score: d.score }))

    try {
      const provider = await getProviderForCompany(companyId)
      const resp = await provider.generateAnswer(companyId, userMessage, docs)
      return { answer: resp.answer, confidence: resp.confidence ?? 0, sources }
    } catch (err) {
      console.error('Assistant generateAnswer error', err)
      return { answer: '', confidence: 0, sources }
    }
  }
}

export const assistantService = new AssistantService()
