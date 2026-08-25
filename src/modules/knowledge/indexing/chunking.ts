/**
 * Text chunking strategies for knowledge documents
 */

export interface ChunkResult {
  chunks: string[]
  tokenCount: number
}

/**
 * Rough token estimation (4 chars ≈ 1 token for English)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Split text into chunks by sentences with overlap
 */
export function chunkBySentences(
  text: string,
  maxChunkTokens: number = 512,
  overlapRatio: number = 0.1
): ChunkResult {
  // Split by sentence boundaries
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  const cleanSentences = sentences.map((s) => s.trim()).filter((s) => s.length > 0)

  const chunks: string[] = []
  let currentChunk: string[] = []
  let currentTokens = 0

  for (const sentence of cleanSentences) {
    const sentenceTokens = estimateTokens(sentence)

    if (currentTokens + sentenceTokens > maxChunkTokens && currentChunk.length > 0) {
      // Save current chunk
      chunks.push(currentChunk.join(' '))

      // Add overlap
      const overlapSentences = Math.max(
        1,
        Math.floor(currentChunk.length * overlapRatio)
      )
      currentChunk = currentChunk.slice(-overlapSentences)
      currentTokens = currentChunk.reduce(
        (sum, s) => sum + estimateTokens(s),
        0
      )
    }

    currentChunk.push(sentence)
    currentTokens += sentenceTokens
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '))
  }

  const totalTokens = estimateTokens(text)

  return {
    chunks,
    tokenCount: totalTokens,
  }
}

/**
 * Split text into chunks by paragraphs
 */
export function chunkByParagraphs(
  text: string,
  maxChunkTokens: number = 512,
  overlapRatio: number = 0.1
): ChunkResult {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  const chunks: string[] = []
  let currentChunk: string[] = []
  let currentTokens = 0

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph)

    if (currentTokens + paragraphTokens > maxChunkTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n\n'))

      const overlapParagraphs = Math.max(
        1,
        Math.floor(currentChunk.length * overlapRatio)
      )
      currentChunk = currentChunk.slice(-overlapParagraphs)
      currentTokens = currentChunk.reduce(
        (sum, p) => sum + estimateTokens(p),
        0
      )
    }

    currentChunk.push(paragraph)
    currentTokens += paragraphTokens
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'))
  }

  const totalTokens = estimateTokens(text)

  return {
    chunks,
    tokenCount: totalTokens,
  }
}

/**
 * Split text into chunks by fixed token count
 */
export function chunkByTokens(
  text: string,
  maxChunkTokens: number = 512,
  overlapRatio: number = 0.1
): ChunkResult {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  let currentChunk: string[] = []
  let currentTokens = 0
  const overlapTokens = Math.floor(maxChunkTokens * overlapRatio)

  for (const word of words) {
    const wordTokens = Math.ceil(word.length / 4)

    if (currentTokens + wordTokens > maxChunkTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '))

      // Calculate overlap in tokens
      let overlapWords: string[] = []
      let overlapCount = 0
      for (let i = currentChunk.length - 1; i >= 0 && overlapCount < overlapTokens; i--) {
        overlapWords.unshift(currentChunk[i])
        overlapCount += Math.ceil(currentChunk[i].length / 4)
      }

      currentChunk = overlapWords
      currentTokens = overlapCount
    }

    currentChunk.push(word)
    currentTokens += wordTokens
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '))
  }

  const totalTokens = estimateTokens(text)

  return {
    chunks,
    tokenCount: totalTokens,
  }
}

/**
 * Choose appropriate chunking strategy
 */
export function smartChunk(
  text: string,
  maxChunkTokens: number = 512,
  overlapRatio: number = 0.1
): ChunkResult {
  // If text has paragraphs, use paragraph-based chunking
  if (text.includes('\n\n')) {
    return chunkByParagraphs(text, maxChunkTokens, overlapRatio)
  }

  // If text has sentences, use sentence-based chunking
  if (text.match(/[.!?]+/)) {
    return chunkBySentences(text, maxChunkTokens, overlapRatio)
  }

  // Fall back to token-based chunking
  return chunkByTokens(text, maxChunkTokens, overlapRatio)
}
