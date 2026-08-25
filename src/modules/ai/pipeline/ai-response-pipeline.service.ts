import { getProviderForCompany } from '../../ai/provider/factory'
import { getRetrieverService } from '../../knowledge/retriever/retriever.service'
import { prisma } from '../../../config/prisma'
import { analyticsService } from '../../ai/analytics/analytics.service'

export interface IntentDetectionResult {
  intent: 'support_question' | 'billing' | 'technical' | 'feedback' | 'unknown'
  confidence: number
  category?: string
}

export interface AIResponsePipelineResult {
  response: string
  confidence: number
  shouldAutoReply: boolean
  shouldEscalate: boolean
  escalationReason?: string
  sources: Array<{ documentId: string; score: number }>
  metadata: {
    intent: IntentDetectionResult
    retrievedDocs: number
    processingTime: number
  }
}

export class AIResponsePipelineService {
  /**
   * Detect intent from user message
   */
  async detectIntent(userMessage: string, companyId?: string): Promise<IntentDetectionResult> {
    try {
      const provider = await getProviderForCompany(companyId)

      const intentPrompt = `Analyze this customer message and categorize the intent into one of these categories:
- support_question: Customer asking for help with a product/service
- billing: Questions about billing, payments, subscriptions
- technical: Technical issues and problems
- feedback: Feature requests or feedback
- unknown: Doesn't fit other categories

Message: "${userMessage}"

Respond with ONLY a JSON object: { "intent": "...", "confidence": 0.0-1.0, "category": "..." }`

      const result = await provider.generateText(intentPrompt, { maxTokens: 200 })

      try {
        const parsed = JSON.parse(result.text)
        return {
          intent: parsed.intent || 'unknown',
          confidence: parsed.confidence ?? 0.5,
          category: parsed.category,
        }
      } catch {
        return { intent: 'unknown', confidence: 0.3 }
      }
    } catch (error) {
      console.error('Intent detection error:', error)
      return { intent: 'unknown', confidence: 0 }
    }
  }

  /**
   * Retrieve relevant knowledge base documents
   */
  async retrieveRelevantDocs(userMessage: string, companyId: string, topK: number = 5): Promise<any[]> {
    try {
      const retriever = getRetrieverService()
      const docs = await retriever.retrieve({
        query: userMessage,
        companyId,
        topK,
      })
      return docs
    } catch (error) {
      console.error('Knowledge retrieval error:', error)
      return []
    }
  }

  /**
   * Build context for LLM
   */
  private buildContext(userMessage: string, docs: any[]): string {
    if (docs.length === 0) {
      return userMessage
    }

    const context = `Context from knowledge base:\n${docs
      .map((d) => `[Doc: ${d.documentId}]\n${d.content}`)
      .join('\n\n')}\n\nCustomer question: ${userMessage}`

    return context
  }

  /**
   * Get company AI settings
   */
  async getCompanySettings(companyId: string): Promise<any> {
    return (prisma as any).aiSettings.findUnique({
      where: { companyId },
    })
  }

  /**
   * Main pipeline: Execute full AI response generation
   */
  async generateResponse(
    userMessage: string,
    conversationId: string,
    companyId: string
  ): Promise<AIResponsePipelineResult> {
    const startTime = Date.now()

    try {
      // 1. Intent Detection
      const intent = await this.detectIntent(userMessage, companyId)

      // 2. Knowledge Retrieval
      const retrievedDocs = await this.retrieveRelevantDocs(userMessage, companyId, 5)

      // 3. Context Builder
      const context = this.buildContext(userMessage, retrievedDocs)

      // 4. LLM Provider generates response
      const provider = await getProviderForCompany(companyId)
      const providerResponse = await provider.generateAnswer(companyId, context, retrievedDocs)

      // 5. Get company settings for decision engine
      const settings = await this.getCompanySettings(companyId)
      const confidenceThreshold = settings?.confidenceThreshold ?? 0.7
      const autoReplyEnabled = settings?.autoReplyEnabled ?? false

      // 6. Decision Engine: Auto-reply vs Escalate
      const confidence = providerResponse.confidence || 0.5
      const shouldAutoReply =
        autoReplyEnabled && confidence >= confidenceThreshold && intent.confidence >= 0.6
      const shouldEscalate = confidence < confidenceThreshold || intent.confidence < 0.4

      const processingTime = Date.now() - startTime

      // Record analytics
      await analyticsService.record({
        companyId,
        conversationId,
        eventType: shouldAutoReply ? 'AI_AUTO_REPLY' : shouldEscalate ? 'AI_ESCALATION' : 'AI_RESPONSE',
        confidence,
        metadata: {
          intent: intent.intent,
          intentConfidence: intent.confidence,
          docCount: retrievedDocs.length,
          processingTime,
        },
      })

      return {
        response: providerResponse.answer,
        confidence,
        shouldAutoReply,
        shouldEscalate,
        escalationReason: confidence < confidenceThreshold ? 'Low confidence response' : undefined,
        sources: providerResponse.sources || [],
        metadata: {
          intent,
          retrievedDocs: retrievedDocs.length,
          processingTime,
        },
      }
    } catch (error) {
      console.error('AI response pipeline error:', error)
      const processingTime = Date.now() - startTime

      await analyticsService.record({
        companyId,
        conversationId,
        eventType: 'AI_ERROR',
        confidence: 0,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTime,
        },
      })

      return {
        response: 'I apologize, but I encountered an error processing your request. An agent will be with you shortly.',
        confidence: 0,
        shouldAutoReply: false,
        shouldEscalate: true,
        escalationReason: 'AI system error',
        sources: [],
        metadata: {
          intent: { intent: 'unknown', confidence: 0 },
          retrievedDocs: 0,
          processingTime,
        },
      }
    }
  }
}

export const aiResponsePipelineService = new AIResponsePipelineService()
