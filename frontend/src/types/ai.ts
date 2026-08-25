export interface AISource {
  documentId: string
  title: string
}

export interface AISuggestion {
  suggestion: string
  confidence: number
  sources: AISource[]
}
