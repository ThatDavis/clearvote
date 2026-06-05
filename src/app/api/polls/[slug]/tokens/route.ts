import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { canManagePoll } from '@/lib/auth'
import { auditLog } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const poll = await prisma.poll.findUnique({ where: { slug } })
  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  }

  if (!session?.user?.id || !(await canManagePoll(poll.id, session.user.id))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const tokens = await prisma.voterToken.findMany({
    where: { pollId: poll.id },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({
    tokens: tokens.map((t) => ({ id: t.id, createdAt: t.createdAt, usedAt: t.usedAt })),
    count: tokens.length,
  })
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const poll = await prisma.poll.findUnique({ where: { slug } })
  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  }

  if (!session?.user?.id || !(await canManagePoll(poll.id, session.user.id))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  if (poll.status !== 'draft') {
    return NextResponse.json({ error: 'Cannot generate tokens after poll is open' }, { status: 400 })
  }

  const body = await request.json()
  const count = Math.min(Math.max(1, body.count || 1), 500)

  const tokens = Array.from({ length: count }, () => ({
    id: randomUUID(),
    pollId: poll.id,
    token: randomUUID(),
  }))

  await prisma.voterToken.createMany({ data: tokens })

  await auditLog({
    pollId: poll.id,
    action: 'tokens_generated',
    detail: `Generated ${count} token(s)`,
  })

  return NextResponse.json(
    {
      tokens: tokens.map((t) => ({ id: t.id, token: t.token })),
      pollSlug: poll.slug,
    },
    { status: 201 },
  )
}
