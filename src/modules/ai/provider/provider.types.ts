export interface GenerateTextOptions {
  temperature?: number
  maxTokens?: number
  model?: string
}

export interface ProviderAnswer {
  answer: string
  confidence: number
  sources?: Array<{ documentId: string; score: number }>
}

export interface AIProvider {
  generateText(prompt: string, options?: GenerateTextOptions): Promise<{ text: string; confidence?: number }>
  generateEmbedding(input: string): Promise<number[]>
  generateAnswer(companyId: string, userMessage: string, docs?: any[]): Promise<ProviderAnswer>
}
