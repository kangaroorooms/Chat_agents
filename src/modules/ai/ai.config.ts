import type { AIConfig } from './ai.types'

/**
 * Load and validate AI configuration from environment
 */
export function loadAIConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase() as 'openai' | 'mock'

  if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required when using OpenAI provider')
  }

  return {
    provider,
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.AI_MODEL || 'gpt-4-turbo',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '6000', 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    contextWindowTokens: parseInt(
      process.env.AI_CONTEXT_WINDOW_TOKENS || '4000',
      10
    ),
    confidenceThreshold: parseFloat(
      process.env.AI_CONFIDENCE_THRESHOLD || '0.7'
    ),
    handoffOnLowConfidence:
      process.env.AI_HANDOFF_ON_LOW_CONFIDENCE === 'true',
    handoffOnUnsupportedTopic:
      process.env.AI_HANDOFF_ON_UNSUPPORTED_TOPIC === 'true',
    streamTimeout: parseInt(process.env.AI_STREAM_TIMEOUT || '60000', 10),
  }
}

/**
 * Get singleton AI config instance
 */
let configInstance: AIConfig | null = null

export function getAIConfig(): AIConfig {
  if (!configInstance) {
    configInstance = loadAIConfig()
  }
  return configInstance
}
