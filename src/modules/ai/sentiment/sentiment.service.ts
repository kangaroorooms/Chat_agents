export class SentimentService {
  analyze(text: string): { score: number; label: 'positive' | 'neutral' | 'negative' } {
    const lower = (text || '').toLowerCase()
    let score = 0
    const positive = ['thank', 'thanks', 'great', 'love', 'good', 'awesome', 'happy']
    const negative = ['not', "don't", 'no', 'bad', 'hate', 'angry', 'unhappy', 'frustrat', 'refund', 'complaint']

    for (const p of positive) if (lower.includes(p)) score += 1
    for (const n of negative) if (lower.includes(n)) score -= 1

    const normalized = Math.max(-1, Math.min(1, score / 3))
    const label = normalized > 0.3 ? 'positive' : normalized < -0.3 ? 'negative' : 'neutral'
    return { score: normalized, label }
  }
}

export const sentimentService = new SentimentService()
