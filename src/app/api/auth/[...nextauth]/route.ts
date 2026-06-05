import { type NextRequest, NextResponse } from 'next/server'
import { handlers } from '@/auth'
import { rateLimit } from '@/lib/rate-limit'

export const { GET } = handlers

export async function POST(request: NextRequest) {
  // Rate limit: 5 login attempts per IP per 5 minutes
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const limit = rateLimit({ key: `login:${ip}`, max: 5, windowMs: 5 * 60_000 })
  if (!limit.success) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429 },
    )
  }

  return handlers.POST(request)
}
