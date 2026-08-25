export interface GenerateTextOptions {
  temperature?: number
  maxTokens?: number
  model?: string
}

export interface AIProvider {
  generateText(prompt: string, options?: GenerateTextOptions): Promise<{ text: string; confidence?: number }>
  generateEmbedding(input: string): Promise<number[]>
}
