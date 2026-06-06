import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { canManageElection } from '@/lib/election'
import { prisma } from '@/lib/prisma'
import { uniqueSlug } from '@/lib/slug'
import { getMethod } from '@/lib/voting-methods'

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const election = await prisma.election.findUnique({
    where: { slug },
    include: { contests: true },
  })
  if (!election) {
    return NextResponse.json({ error: 'Election not found' }, { status: 404 })
  }

  if (!session?.user?.id || !(await canManageElection(election.id, session.user.id))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  if (election.status !== 'draft') {
    return NextResponse.json(
      { error: 'Can only modify contests while election is in draft' },
      { status: 400 },
    )
  }

  const body = await request.json()
  const { title, description, votingMethod, seats, threshold, options } = body as {
    title?: string
    description?: string
    votingMethod?: string
    seats?: number
    threshold?: number
    options?: string[]
  }

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const minOptions = getMethod(votingMethod || 'rcv').minOptions
  if (!options || !Array.isArray(options) || options.length < minOptions) {
    return NextResponse.json(
      { error: `At least ${minOptions} option${minOptions === 1 ? '' : 's'} are required` },
      { status: 400 },
    )
  }

  const contestSlug = await uniqueSlug(title.trim())
  const nextOrder = election.contests.length

  const contest = await prisma.poll.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      slug: contestSlug,
      votingMethod: votingMethod || 'rcv',
      seats: seats || 1,
      threshold: threshold ?? 50,
      electionId: election.id,
      contestOrder: nextOrder,
      creatorId: session.user.id,
      organizationId: election.organizationId,
      options: {
        create: options.map((label, index) => ({
          label: label.trim(),
          order: index,
        })),
      },
    },
    include: {
      options: {
        orderBy: { order: 'asc' },
      },
    },
  })

  return NextResponse.json(contest, { status: 201 })
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

  if (election.status !== 'draft') {
    return NextResponse.json(
      { error: 'Can only reorder contests while election is in draft' },
      { status: 400 },
    )
  }

  const body = await request.json()
  const { contestOrders } = body as { contestOrders?: { contestId: string; order: number }[] }

  if (!contestOrders || !Array.isArray(contestOrders)) {
    return NextResponse.json({ error: 'contestOrders is required' }, { status: 400 })
  }

  await prisma.$transaction(
    contestOrders.map((c) =>
      prisma.poll.updateMany({
        where: { id: c.contestId, electionId: election.id },
        data: { contestOrder: c.order },
      }),
    ),
  )

  return NextResponse.json({ success: true })
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
      { error: 'Can only delete contests while election is in draft' },
      { status: 400 },
    )
  }

  const body = await request.json()
  const { contestId } = body as { contestId?: string }

  if (!contestId) {
    return NextResponse.json({ error: 'contestId is required' }, { status: 400 })
  }

  await prisma.poll.deleteMany({
    where: { id: contestId, electionId: election.id },
  })

  return NextResponse.json({ success: true })
}
