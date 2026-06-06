import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { canManageElection } from '@/lib/election'
import { prisma } from '@/lib/prisma'
import { getMethod } from '@/lib/voting-methods'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; contestId: string }> },
) {
  const { slug, contestId } = await params
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
      { error: 'Can only edit contests while election is in draft' },
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

  // Verify contest belongs to this election
  const contest = await prisma.poll.findFirst({
    where: { id: contestId, electionId: election.id },
  })
  if (!contest) {
    return NextResponse.json({ error: 'Contest not found' }, { status: 404 })
  }

  const updateData: Record<string, unknown> = {}
  if (title !== undefined) updateData.title = title.trim()
  if (description !== undefined) updateData.description = description?.trim() || null
  if (votingMethod !== undefined) updateData.votingMethod = votingMethod
  if (seats !== undefined) updateData.seats = seats
  if (threshold !== undefined) updateData.threshold = threshold

  await prisma.poll.update({
    where: { id: contestId },
    data: updateData,
  })

  // Update options if provided
  if (options && Array.isArray(options)) {
    const minOptions = getMethod(votingMethod || 'rcv').minOptions
    if (options.length < minOptions) {
      return NextResponse.json(
        { error: `At least ${minOptions} option${minOptions === 1 ? '' : 's'} are required` },
        { status: 400 },
      )
    }

    await prisma.$transaction([
      prisma.pollOption.deleteMany({ where: { pollId: contestId } }),
      ...options.map((label, index) =>
        prisma.pollOption.create({
          data: {
            pollId: contestId,
            label: label.trim(),
            order: index,
          },
        }),
      ),
    ])
  }

  const updated = await prisma.poll.findUnique({
    where: { id: contestId },
    include: {
      options: { orderBy: { order: 'asc' } },
    },
  })

  return NextResponse.json(updated)
}
