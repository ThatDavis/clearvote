interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

export function rateLimit({
  key,
  max,
  windowMs,
}: {
  key: string
  max: number
  windowMs: number
}): { success: boolean; resetAt: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, resetAt: now + windowMs }
  }

  if (entry.count >= max) {
    return { success: false, resetAt: entry.resetAt }
  }

  entry.count += 1
  return { success: true, resetAt: entry.resetAt }
}

export function getRateLimitReset(key: string): number | null {
  const entry = store.get(key)
  return entry ? entry.resetAt : null
}
