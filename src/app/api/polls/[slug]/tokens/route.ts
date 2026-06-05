import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const poll = await prisma.poll.findUnique({ where: { slug } })
  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  }

  const body = await request.json()
  const count = Math.min(Math.max(1, body.count || 1), 500)

  const tokens = Array.from({ length: count }, () => ({
    pollId: poll.id,
    token: randomUUID(),
  }))

  await prisma.voterToken.createMany({ data: tokens })

  const created = await prisma.voterToken.findMany({
    where: {
      pollId: poll.id,
      token: { in: tokens.map((t) => t.token) },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(
    {
      tokens: created.map((t) => ({ id: t.id, token: t.token })),
      pollSlug: poll.slug,
    },
    { status: 201 },
  )
}
