import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { canManageElection } from '@/lib/election'
import { prisma } from '@/lib/prisma'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const election = await prisma.election.findUnique({ where: { slug } })
  if (!election) {
    return NextResponse.json({ error: 'Election not found' }, { status: 404 })
  }

  const roll = await prisma.electionVoterRoll.findMany({
    where: { electionId: election.id },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { id: 'asc' },
  })

  return NextResponse.json(roll)
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
      { error: 'Cannot modify voter roll after election is open' },
      { status: 400 },
    )
  }

  const body = await request.json()
  const { email } = body as { email?: string }

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  })

  if (!user) {
    return NextResponse.json({ error: 'No user found with that email' }, { status: 404 })
  }

  const existing = await prisma.electionVoterRoll.findUnique({
    where: {
      electionId_userId: {
        electionId: election.id,
        userId: user.id,
      },
    },
  })

  if (existing) {
    return NextResponse.json({ error: 'User is already on the voter roll' }, { status: 409 })
  }

  const entry = await prisma.electionVoterRoll.create({
    data: {
      electionId: election.id,
      userId: user.id,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  return NextResponse.json(entry, { status: 201 })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
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
      { error: 'Cannot modify voter roll after election is open' },
      { status: 400 },
    )
  }

  const body = await request.json()
  const { userId } = body as { userId?: string }

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  await prisma.electionVoterRoll.deleteMany({
    where: {
      electionId: election.id,
      userId,
    },
  })

  return NextResponse.json({ success: true })
}
