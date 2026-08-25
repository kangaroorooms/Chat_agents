export function getErrorMessage(e: unknown, fallback = 'Unknown error') {
  if (!e) return fallback
  if (typeof e === 'string') return e
  if (typeof e === 'object') {
    const o = e as Record<string, unknown>
    const nested = o['response'] as Record<string, unknown> | undefined
    const nestedMsg = (nested?.['data'] as Record<string, unknown> | undefined)?.['message'] as string | undefined
    const topMsg = (o as Record<string, unknown>)['message'] as string | undefined
    return nestedMsg ?? topMsg ?? fallback
  }
  return fallback
}
