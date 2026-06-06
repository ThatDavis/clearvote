import { randomBytes, randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { badRequest, notFound, unauthorized } from '@/lib/api/responses'
import { audit } from '@/lib/audit'
import { canManagePoll } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/token'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const poll = await prisma.poll.findUnique({ where: { slug } })
  if (!poll) return notFound()
  if (!session?.user?.id || !(await canManagePoll(poll.id, session.user.id))) {
    return unauthorized()
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
  if (!poll) return notFound()
  if (!session?.user?.id || !(await canManagePoll(poll.id, session.user.id))) {
    return unauthorized()
  }

  if (poll.status !== 'draft') {
    return badRequest('Cannot generate tokens after poll is open')
  }

  const body = await request.json()
  const count = Math.min(Math.max(1, body.count || 1), 500)

  const rawTokens = Array.from({ length: count }, () => ({
    id: randomUUID(),
    raw: randomBytes(32).toString('hex'),
  }))

  const dbTokens = rawTokens.map((t) => ({
    id: t.id,
    pollId: poll.id,
    tokenHash: hashToken(t.raw),
  }))

  await prisma.voterToken.createMany({ data: dbTokens })

  await audit({
    kind: 'poll',
    entityId: poll.id,
    action: 'tokens_generated',
    detail: `Generated ${count} token(s)`,
  })

  return NextResponse.json(
    {
      tokens: rawTokens.map((t) => ({ id: t.id, token: t.raw })),
      pollSlug: poll.slug,
    },
    { status: 201 },
  )
}
