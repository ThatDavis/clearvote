import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { canManageElection } from '@/lib/election'
import { electionAuditLog } from '@/lib/election-audit'
import { prisma } from '@/lib/prisma'

const validTransitions: Record<string, string[]> = {
  draft: ['open'],
  open: ['closed'],
  closed: [],
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const election = await prisma.election.findUnique({
    where: { slug },
    include: {
      contests: {
        orderBy: { contestOrder: 'asc' },
        include: {
          options: {
            orderBy: { order: 'asc' },
          },
          _count: {
            select: { ballots: true },
          },
        },
      },
    },
  })

  if (!election) {
    return NextResponse.json({ error: 'Election not found' }, { status: 404 })
  }

  return NextResponse.json(election)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const election = await prisma.election.findUnique({ where: { slug } })
  if (!election) {
    return NextResponse.json({ error: 'Election not found' }, { status: 404 })
  }

  if (!session?.user?.id || !(await canManageElection(election.id, session.user.id))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = await request.json()
  const { status, title, description } = body as {
    status?: string
    title?: string
    description?: string
  }

  // Content edit (draft only)
  if (title !== undefined || description !== undefined) {
    if (election.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only edit elections in draft status' },
        { status: 400 },
      )
    }

    const updated = await prisma.election.update({
      where: { slug },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
      },
    })

    return NextResponse.json(updated)
  }

  // Status transition
  if (!status || !validTransitions[election.status].includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${election.status} to ${status}` },
      { status: 400 },
    )
  }

  // Guard opening
  if (status === 'open') {
    const contests = await prisma.poll.findMany({
      where: { electionId: election.id },
      include: { options: true },
    })

    if (contests.length === 0) {
      return NextResponse.json(
        { error: 'Cannot open an election with no contests' },
        { status: 400 },
      )
    }

    const incomplete = contests
      .filter((c) => {
        const min = c.votingMethod === 'yesno' ? 1 : 2
        return c.options.length < min
      })
      .map((c) => c.title)

    if (incomplete.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot open election - the following contests have too few options: ${incomplete.join(', ')}`,
        },
        { status: 400 },
      )
    }
  }

  const updated = await prisma.election.update({
    where: { slug },
    data: { status },
  })

  await electionAuditLog({
    electionId: election.id,
    action: status === 'open' ? 'election_opened' : 'election_closed',
  })

  return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
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
      { error: 'Can only delete elections in draft status' },
      { status: 400 },
    )
  }

  await prisma.election.delete({ where: { slug } })

  return NextResponse.json({ success: true })
}
