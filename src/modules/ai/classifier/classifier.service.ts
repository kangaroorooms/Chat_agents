import { getRetrieverService } from '../../knowledge/retriever/retriever.service'

export type AIIntent =
  | 'greeting'
  | 'faq'
  | 'product_question'
  | 'pricing_question'
  | 'support_request'
  | 'complaint'
  | 'refund_request'
  | 'escalation_request'
  | 'unknown'

export class ClassifierService {
  // Simple rule-based classifier using keyword maps and KB lookup
  private intentKeywords: Record<AIIntent, string[]> = {
    greeting: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
    faq: ['how do i', 'how to', 'what is', 'where can i', 'faq', 'help center'],
    product_question: ['product', 'feature', 'does it', 'supports'],
    pricing_question: ['price', 'pricing', 'cost', 'subscription', 'plan', 'how much'],
    support_request: ['help', 'support', 'issue', 'problem', 'ticket'],
    complaint: ['complaint', 'not happy', 'unhappy', 'poor', 'bad', 'frustrat'],
    refund_request: ['refund', 'money back', 'charge', 'chargeback'],
    escalation_request: ['escalate', 'supervisor', 'manager', 'escalation', 'urgent'],
    unknown: [],
  }

  async classify(text: string, companyId?: string): Promise<{ intent: AIIntent; confidence: number }> {
    const lower = (text || '').toLowerCase()

    // score keywords
    let best: AIIntent = 'unknown'
    let bestScore = 0

    for (const intent of Object.keys(this.intentKeywords) as AIIntent[]) {
      const keywords = this.intentKeywords[intent]
      if (!keywords || keywords.length === 0) continue
      let score = 0
      for (const kw of keywords) {
        if (lower.includes(kw)) score += 1
      }
      if (score > bestScore) {
        best = intent
        bestScore = score
      }
    }

    // basic confidence mapping
    let confidence = 0.5
    if (best === 'unknown') confidence = 0.4
    else confidence = Math.min(0.95, 0.5 + bestScore * 0.15)

    // if KB contains high-similarity documents for query, bump confidence for faq/product/pricing
    try {
      if (companyId && ['faq', 'product_question', 'pricing_question'].includes(best)) {
        const retriever = getRetrieverService()
        const docs = await retriever.retrieve({ query: text, companyId, topK: 3 })
        if (docs.length > 0 && docs[0].score > 0.8) {
          confidence = Math.max(confidence, 0.85)
        }
      }
    } catch (err) {
      // ignore retrieval errors
    }

    return { intent: best, confidence }
  }
}

export const classifierService = new ClassifierService()
