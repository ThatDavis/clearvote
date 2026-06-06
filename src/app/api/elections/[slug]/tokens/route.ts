import { randomBytes, randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { badRequest, notFound, unauthorized } from '@/lib/api/responses'
import { audit } from '@/lib/audit'
import { canManageElection } from '@/lib/election'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/token'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const election = await prisma.election.findUnique({ where: { slug } })
  if (!election) return notFound()
  if (!session?.user?.id || !(await canManageElection(election.id, session.user.id))) {
    return unauthorized()
  }

  const tokens = await prisma.electionVoterToken.findMany({
    where: { electionId: election.id },
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

  const election = await prisma.election.findUnique({ where: { slug } })
  if (!election) return notFound()
  if (!session?.user?.id || !(await canManageElection(election.id, session.user.id))) {
    return unauthorized()
  }

  if (election.status !== 'draft') {
    return badRequest('Cannot generate tokens after election is open')
  }

  const body = await request.json()
  const count = Math.min(Math.max(1, body.count || 1), 500)

  const rawTokens = Array.from({ length: count }, () => ({
    id: randomUUID(),
    raw: randomBytes(32).toString('hex'),
  }))

  const dbTokens = rawTokens.map((t) => ({
    id: t.id,
    electionId: election.id,
    tokenHash: hashToken(t.raw),
  }))

  await prisma.electionVoterToken.createMany({ data: dbTokens })

  await audit({
    kind: 'election',
    entityId: election.id,
    action: 'tokens_generated',
    detail: `Generated ${count} token(s)`,
  })

  return NextResponse.json(
    {
      tokens: rawTokens.map((t) => ({ id: t.id, token: t.raw })),
      electionSlug: election.slug,
    },
    { status: 201 },
  )
}
