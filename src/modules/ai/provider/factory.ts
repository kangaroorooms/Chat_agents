import { prisma } from '../../../config/prisma'
import { AIProvider } from './provider.types'
import { mockProvider } from './mock.provider'
import { OpenAIProvider } from './openai.provider'
import AnthropicProvider from './anthropic.provider'
import GeminiProvider from './gemini.provider'

const cache: Record<string, AIProvider> = {}

export async function getProviderForCompany(companyId?: string): Promise<AIProvider> {
  if (!companyId) return mockProvider
  if (cache[companyId]) return cache[companyId]

  try {
    const settings = await (prisma as any).aiSettings.findUnique({ where: { companyId } })
    if (!settings) return mockProvider

    const providerName = (settings.provider || 'mock').toLowerCase()
    let provider: AIProvider = mockProvider
    if (providerName === 'openai') {
      provider = new OpenAIProvider(settings.apiKey || undefined)
    } else if (providerName === 'anthropic') {
      provider = new AnthropicProvider(settings.apiKey || undefined)
    } else if (providerName === 'gemini') {
      provider = new GeminiProvider(settings.apiKey || undefined)
    } else {
      provider = mockProvider
    }

    cache[companyId] = provider
    return provider
  } catch (err) {
    console.error('Provider factory error', err)
    return mockProvider
  }
}
