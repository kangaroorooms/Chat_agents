import OpenAI from 'openai'
import { getAIConfig } from './ai.config'
import {
  buildConversationContext,
  truncateContextWindow,
  buildSystemPrompt,
  formatMessagesForAPI,
} from './ai.memory'
import type { AIResponse, AISuggestions, ConversationSummary } from './ai.types'
import {
  buildConversationContextWithRetrieval
} from './context-builder.service';
import type { Message } from '@prisma/client'
import { getRetrieverService } from '../knowledge/retriever/retriever.service'
import { getPromptBuilder } from '../knowledge/prompt/prompt-builder'
import { getAIPlanner } from './planner/planner.service'
import { llmToolAdapter } from './tools/llm.adapter'

export interface OpenAIChatCompletionStream {
  [Symbol.asyncIterator](): AsyncIterator<any>
}

export interface OpenAIClient {
  chat: {
    completions: {
      create: (opts: any) => Promise<any | OpenAIChatCompletionStream>
    }
  }
}

export interface LLMToolAdapterInterface {
  handleToolCall(toolName: string, rawInput: unknown): Promise<any>
}

/**
 * AI Service - handles all LLM operations
 */
class AIServiceImpl {
  private openai: OpenAIClient
  private toolAdapter: LLMToolAdapterInterface
  private config

  constructor(
    openaiClient?: OpenAIClient,
    toolAdapter?: LLMToolAdapterInterface
  ) {
    this.config = getAIConfig()

    if (openaiClient) {
      this.openai = openaiClient
    } else if (this.config.provider === 'mock') {
      this.openai = {
        chat: {
          completions: {
            create: async () => {
              const stream = {
                async *[Symbol.asyncIterator]() {
                  yield {
                    choices: [{ delta: { content: 'mock ai response' } }],
                    usage: { prompt_tokens: 0, completion_tokens: 0 },
                  }
                },
              }
              return stream
            },
          },
        },
      } as OpenAIClient
    } else {
      this.openai = new OpenAI({
        apiKey: this.config.apiKey,
      })
    }

    this.toolAdapter = toolAdapter ?? llmToolAdapter
  }

  /**
   * Handle a tool/function call originating from an LLM.
   * Provider-neutral adapter will validate, create a plan, and execute via planner/toolRegistry.
   */
  async invokeLLMTool(toolName: string, rawInput: unknown) {
    try {
      const results = await this.toolAdapter.handleToolCall(toolName, rawInput)
      return { success: true, results }
    } catch (error) {
      console.error('Error invoking LLM tool:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Generate a response to a user message with streaming
   * Returns an async iterator of text chunks
   */
  async *generateResponseStream(
    conversationId: string,
    userMessage: string,
    companyId?: string
  ): AsyncGenerator<string, AIResponse, unknown> {
    const context = await buildConversationContext(conversationId)
    const messages = truncateContextWindow(
      context.messages,
      this.config.contextWindowTokens
    )

    // Use AIPlanner to determine whether tools should be executed (e.g., searchKnowledge)
    let retrievedDocuments: any[] = []
    const toolResults: Array<{ toolName: string; result: unknown }> = []
    try {
      const planner = getAIPlanner()
      const plan = await planner.planForQuery(userMessage, { companyId, conversationId })
      if (plan) {
        const execResults = await planner.executePlan(plan)
        for (const r of execResults) {
          toolResults.push({ toolName: r.toolName, result: r.result })
          if (r.toolName === 'searchKnowledge' && Array.isArray(r.result)) {
            retrievedDocuments = (r.result as any[])
          }
        }
      }
    } catch (error) {
      console.error('Planner error:', error)
    }

    // Format messages for OpenAI
    const apiMessages = formatMessagesForAPI(messages)
    apiMessages.push({ role: 'user', content: userMessage })

    // Build augmented system prompt with knowledge base context
    const promptBuilder = getPromptBuilder()
    const augmentedSystemPrompt = promptBuilder.buildSystemPrompt({
      conversation: messages.map((m) => ({ role: m.senderId === 'ai-system' ? 'assistant' : 'user', content: m.content })),
      retrievedDocuments,
      customerContext: {
        customerId: context.customerId,
        agentId: context.agentId,
      },
      toolResults,
    })

    try {
      const stream = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: augmentedSystemPrompt },
          ...apiMessages,
        ] as any,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: true,
      })

      let fullContent = ''
      let promptTokens = 0
      let completionTokens = 0

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta
        if (delta?.content) {
          fullContent += delta.content
          yield delta.content
        }
        if (chunk.usage) {
          promptTokens = chunk.usage.prompt_tokens
          completionTokens = chunk.usage.completion_tokens
        }
      }

      const confidence = this.calculateConfidenceScore(fullContent)
      const shouldHandoff = this.shouldHandoff(confidence, fullContent)

      return {
        content: fullContent,
        confidence,
        shouldHandoff,
        handoffReason: shouldHandoff
          ? 'Conversation requires human agent expertise'
          : undefined,
        tokenUsage: {
          prompt: promptTokens,
          completion: completionTokens,
          total: promptTokens + completionTokens,
        },
        generatedAt: new Date(),
      }
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        throw new Error(`OpenAI API error: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Generate response suggestions for an agent
   */
  async generateSuggestions(
    conversationId: string,
    lastUserMessage: string
  ): Promise<AISuggestions> {
    // Build enriched context (includes retrieved KB docs when available)
    try {
      const ctx =
      await buildConversationContextWithRetrieval(conversationId);

      const messages = truncateContextWindow(
        ctx.messages,
        Math.floor(this.config.contextWindowTokens / 2)
      )

      const apiMessages = formatMessagesForAPI(messages)
      apiMessages.push({ role: 'user', content: lastUserMessage })

      // Build augmented system prompt with retrieved documents
      const promptBuilder = getPromptBuilder();
      const augmentedSystemPrompt = promptBuilder.buildSystemPrompt({
        conversation: messages.map((m) => ({ role: m.senderId === 'ai-system' ? 'assistant' : 'user', content: m.content })),
        retrievedDocuments: ctx.retrievedDocuments || [],
        customerContext: { customerId: ctx.customerId, agentId: ctx.agentId },
      })

      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: `Generate 3 short response suggestions (max 80 chars each) for the agent to send to the customer. Format as a JSON array of strings and reply ONLY with that array.` },
          { role: 'system', content: augmentedSystemPrompt },
          ...apiMessages,
        ] as any,
        max_tokens: 300,
        temperature: 0.3,
      })

      const content = response.choices[0]?.message?.content || '[]'
      const parsed = JSON.parse(content)
      const suggestions = Array.isArray(parsed) ? parsed : []

      // provide related articles from retrieved documents
      const relatedArticles = (ctx.retrievedDocuments || []).slice(0, 5).map((d: any) => ({ documentId: d.documentId, score: d.score, snippet: d.content?.slice(0, 300) }))

      // heuristic recommended actions
      const actions: string[] = []
      const low = lastUserMessage.toLowerCase()
      if (/(refund|money back|chargeback)/i.test(low)) actions.push('Offer refund - escalate to billing')
      if (/(cancel|stop subscription|unsubscribe)/i.test(low)) actions.push('Offer cancellation flow')
      if (/(error|stack trace|exception|bug)/i.test(low)) actions.push('Request logs and reproduction steps')
      if (/(asap|urgent|escalate|supervisor|manager)/i.test(low)) actions.push('Escalate to senior agent')

      return {
        suggestions: suggestions.slice(0, 3),
        confidence: 0.8,
        topic: undefined,
        generatedAt: new Date(),
        // attach extras
        // @ts-ignore - extended fields
        relatedArticles,
        // @ts-ignore
        recommendedActions: actions,
      } as any
    } catch (error) {
      console.error('Error generating suggestions:', error)
      return { suggestions: [], confidence: 0, generatedAt: new Date() }
    }
  }

  /**
   * Summarize a conversation
   */
  async summarizeConversation(
    messages: Message[]
  ): Promise<ConversationSummary> {
    if (messages.length === 0) {
      return {
        summary: 'No messages to summarize',
        keyPoints: [],
        generatedAt: new Date(),
      }
    }

    const messageText = messages
      .map((m) => `${m.senderId === 'ai-system' ? 'AI' : 'Customer'}: ${m.content}`)
      .join('\n')

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content:
              'Summarize the conversation in 2-3 sentences. Highlight key issues and resolutions.',
          },
          {
            role: 'user',
            content: messageText,
          },
        ] as any,
        max_tokens: 200,
        temperature: 0.3,
      })

      const summary = response.choices[0]?.message?.content || ''

      return {
        summary,
        keyPoints: [],
        generatedAt: new Date(),
      }
    } catch (error) {
      console.error('Error summarizing conversation:', error)
      return {
        summary: `Conversation with ${messages.length} messages`,
        keyPoints: [],
        generatedAt: new Date(),
      }
    }
  }

  /**
   * Calculate confidence score for a response (0-1)
   * Higher score = more confident
   */
  private calculateConfidenceScore(content: string): number {
    // Placeholder scoring logic
    // In production, this would use more sophisticated analysis
    const hasQuestionMark = content.includes('?')
    const hasQualifier = /unsure|not sure|may|might|possibly|approximately|about/i.test(
      content
    )
    const hasNegation = /not sure|don't know|no information|unclear/i.test(
      content
    )

    let score = 0.75 // base confidence

    if (hasNegation) score -= 0.3
    if (hasQualifier) score -= 0.1
    if (hasQuestionMark) score -= 0.05
    if (content.length > 100) score += 0.05 // longer responses tend to be more confident

    return Math.max(0, Math.min(1, score))
  }

  /**
   * Determine if conversation should be handed off to human
   */
  private shouldHandoff(confidence: number, content: string): boolean {
    // Low confidence
    if (this.config.handoffOnLowConfidence && confidence < this.config.confidenceThreshold) {
      return true
    }

    // Keywords indicating escalation
    const escalationKeywords = /escalate|manager|supervisor|complaint|urgent|emergency|billing/i
    if (escalationKeywords.test(content)) {
      return true
    }

    return false
  }
}

// Singleton instance
let aiServiceInstance: AIServiceImpl | null = null

export function getAIService(): AIServiceImpl {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIServiceImpl()
  }
  return aiServiceInstance
}

export { AIServiceImpl }
