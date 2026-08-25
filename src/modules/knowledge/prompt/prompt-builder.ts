import type { PromptBuilder, PromptContext, RetrievedDocument } from '../knowledge.types'

export class PromptBuilderImpl implements PromptBuilder {
  buildSystemPrompt(context: PromptContext): string {
    const basePrompt = `You are a helpful and professional customer support agent.

Conversation Context:
- Message Count: ${context.conversation.length}
${context.customerContext ? `- Customer Context: ${JSON.stringify(context.customerContext)}` : ''}

${
  context.retrievedDocuments.length > 0
    ? `Knowledge Base Context:
${this.formatRetrievedDocuments(context.retrievedDocuments)}

Use the knowledge base information above to provide accurate and informed responses.
If the user's question is not covered in the knowledge base, acknowledge this and provide the best assistance you can.`
    : 'No relevant knowledge base documents available for this query.'
}

Guidelines:
1. Be empathetic and professional
2. Provide clear and concise answers
3. Reference knowledge base information when relevant
4. If the issue is complex or outside knowledge base scope, offer to escalate to a human agent
5. Use the conversation history for context
6. Be honest if you don't know something
7. Offer specific next steps or solutions

Always maintain a helpful and respectful tone.`

    return basePrompt
  }

  buildUserPromptWithContext(
    message: string,
    context: PromptContext
  ): string {
    if (context.retrievedDocuments.length === 0) {
      return message
    }

    const contextInfo = `Context from Knowledge Base:
${this.formatRetrievedDocuments(context.retrievedDocuments)}

User Message: ${message}`

    return contextInfo
  }

  formatRetrievedDocuments(docs: RetrievedDocument[]): string {
    if (docs.length === 0) {
      return 'No relevant documents found.'
    }

    const formatted = docs
      .map((doc, index) => {
        const relevance = `${(doc.score * 100).toFixed(0)}%`
        return `[Document ${index + 1} - Relevance: ${relevance}]
${doc.content}

---`
      })
      .join('\n')

    return formatted
  }
}

let promptBuilderInstance: PromptBuilderImpl | null = null

export function getPromptBuilder(): PromptBuilderImpl {
  if (!promptBuilderInstance) {
    promptBuilderInstance = new PromptBuilderImpl()
  }
  return promptBuilderInstance
}
