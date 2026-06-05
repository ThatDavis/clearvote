import { randomBytes, randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { canManageElection } from '@/lib/election'
import { electionAuditLog } from '@/lib/election-audit'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/token'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const election = await prisma.election.findUnique({ where: { slug } })
  if (!election) {
    return NextResponse.json({ error: 'Election not found' }, { status: 404 })
  }

  if (!session?.user?.id || !(await canManageElection(election.id, session.user.id))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
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
  if (!election) {
    return NextResponse.json({ error: 'Election not found' }, { status: 404 })
  }

  if (!session?.user?.id || !(await canManageElection(election.id, session.user.id))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  if (election.status !== 'draft') {
    return NextResponse.json(
      { error: 'Cannot generate tokens after election is open' },
      { status: 400 },
    )
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

  await electionAuditLog({
    electionId: election.id,
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
