import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
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
