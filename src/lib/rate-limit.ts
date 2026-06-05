/**
 * In-process rate limiter using a Map.
 *
 * ⚠️  LIMITATION: This only works correctly for a **single long-lived instance**
 * (e.g. the Docker Compose deployment). On serverless or multi-instance setups
 * the store resets on every cold start and is not shared across instances, so
 * limits are far weaker than they appear. For those environments a shared store
 * (e.g. Redis / Upstash) is required.
 *
 * ⚠️  TRUSTED PROXY: IP comes from `x-forwarded-for`, which is client-spoofable
 * unless a trusted proxy overwrites it. Ensure your deployment sits behind a
 * known proxy (e.g. nginx, Vercel, Cloudflare) that sanitises this header.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

export function rateLimit({ key, max, windowMs }: { key: string; max: number; windowMs: number }): {
  success: boolean
  resetAt: number
} {
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
