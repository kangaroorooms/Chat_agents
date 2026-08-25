import { getProviderForCompany } from '../provider/factory'
import { getRetrieverService } from '../../knowledge/retriever/retriever.service'

export interface AgentAssistResult {
  type: 'reply' | 'summary' | 'nextAction' | 'tags' | 'notes'
  content: string
  confidence: number
}

export class AgentAssistService {
  /**
   * Generate reply suggestion for agent
   */
  async generateReplySuggestion(
    conversationId: string,
    companyId: string,
    userMessage: string,
    conversationHistory?: string
  ): Promise<AgentAssistResult> {
    try {
      const provider = await getProviderForCompany(companyId)

      const prompt = `You are assisting a support agent. Based on the customer message and conversation history, generate a professional, helpful reply.

Conversation history (if any):
${conversationHistory || 'N/A'}

Customer message: "${userMessage}"

Generate a concise, helpful reply that the agent can use or modify.`

      const result = await provider.generateText(prompt, { maxTokens: 500 })

      return {
        type: 'reply',
        content: result.text,
        confidence: result.confidence ?? 0.8,
      }
    } catch (error) {
      console.error('Generate reply suggestion error:', error)
      return {
        type: 'reply',
        content: 'Unable to generate suggestion',
        confidence: 0,
      }
    }
  }

  /**
   * Generate conversation summary
   */
  async generateConversationSummary(
    conversationId: string,
    companyId: string,
    conversationHistory: string
  ): Promise<AgentAssistResult> {
    try {
      const provider = await getProviderForCompany(companyId)

      const prompt = `Summarize this customer support conversation in 2-3 sentences. Focus on the main issue and resolution.

Conversation:
${conversationHistory}

Provide a concise summary.`

      const result = await provider.generateText(prompt, { maxTokens: 200 })

      return {
        type: 'summary',
        content: result.text,
        confidence: result.confidence ?? 0.85,
      }
    } catch (error) {
      console.error('Generate summary error:', error)
      return {
        type: 'summary',
        content: 'Unable to generate summary',
        confidence: 0,
      }
    }
  }

  /**
   * Generate next action suggestion
   */
  async generateNextAction(
    conversationId: string,
    companyId: string,
    conversationHistory: string
  ): Promise<AgentAssistResult> {
    try {
      const provider = await getProviderForCompany(companyId)

      const prompt = `Based on this support conversation, suggest the next best action for the support agent.

Conversation:
${conversationHistory}

Suggest ONE next action that would best help resolve the customer's issue. Be specific and actionable.`

      const result = await provider.generateText(prompt, { maxTokens: 200 })

      return {
        type: 'nextAction',
        content: result.text,
        confidence: result.confidence ?? 0.8,
      }
    } catch (error) {
      console.error('Generate next action error:', error)
      return {
        type: 'nextAction',
        content: 'Unable to generate suggestion',
        confidence: 0,
      }
    }
  }

  /**
   * Generate suggested tags
   */
  async generateSuggestedTags(
    conversationId: string,
    companyId: string,
    conversationHistory: string
  ): Promise<AgentAssistResult> {
    try {
      const provider = await getProviderForCompany(companyId)

      const prompt = `Based on this support conversation, suggest 3-5 relevant tags that categorize the issue.

Conversation:
${conversationHistory}

Respond with ONLY a JSON array of tags, e.g.: ["tag1", "tag2", "tag3"]`

      const result = await provider.generateText(prompt, { maxTokens: 200 })

      try {
        const tags = JSON.parse(result.text)
        return {
          type: 'tags',
          content: tags.join(', '),
          confidence: result.confidence ?? 0.8,
        }
      } catch {
        return {
          type: 'tags',
          content: result.text,
          confidence: result.confidence ?? 0.6,
        }
      }
    } catch (error) {
      console.error('Generate tags error:', error)
      return {
        type: 'tags',
        content: 'Unable to generate tags',
        confidence: 0,
      }
    }
  }

  /**
   * Generate conversation notes
   */
  async generateConversationNotes(
    conversationId: string,
    companyId: string,
    conversationHistory: string
  ): Promise<AgentAssistResult> {
    try {
      const provider = await getProviderForCompany(companyId)

      const prompt = `Generate helpful internal notes for this support conversation that summarize key points for follow-up or handoff.

Conversation:
${conversationHistory}

Provide professional internal notes that capture the customer's issue, attempts to resolve, and important details.`

      const result = await provider.generateText(prompt, { maxTokens: 300 })

      return {
        type: 'notes',
        content: result.text,
        confidence: result.confidence ?? 0.85,
      }
    } catch (error) {
      console.error('Generate notes error:', error)
      return {
        type: 'notes',
        content: 'Unable to generate notes',
        confidence: 0,
      }
    }
  }
}

export const agentAssistService = new AgentAssistService()
