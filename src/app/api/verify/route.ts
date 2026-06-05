import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(request: Request) {
  // Rate limit: 30 verify requests per IP per minute
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const limit = rateLimit({ key: `verify:${ip}`, max: 30, windowMs: 60_000 })
  if (!limit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 },
    )
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'Receipt code is required' }, { status: 400 })
  }

  const ballot = await prisma.ballot.findUnique({
    where: { receiptCode: code },
    include: {
      poll: {
        select: { title: true, slug: true, status: true },
      },
    },
  })

  if (!ballot) {
    return NextResponse.json({ found: false }, { status: 404 })
  }

  return NextResponse.json({
    found: true,
    pollTitle: ballot.poll.title,
    pollSlug: ballot.poll.slug,
    pollStatus: ballot.poll.status,
    castAt: ballot.castAt,
  })
}
