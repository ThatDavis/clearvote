import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { auditLog } from '@/lib/audit'
import { canManagePoll } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const poll = await prisma.poll.findUnique({
    where: { slug },
    include: {
      options: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  }

  return NextResponse.json(poll)
}

const validTransitions: Record<string, string[]> = {
  draft: ['open'],
  open: ['closed'],
  closed: [],
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const poll = await prisma.poll.findUnique({ where: { slug } })
  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  }

  if (!session?.user?.id || !(await canManagePoll(poll.id, session.user.id))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = await request.json()
  const { status, title, description, options } = body as {
    status?: string
    title?: string
    description?: string
    options?: { label: string }[]
  }

  // Content edit (draft only)
  if (title !== undefined || description !== undefined || options !== undefined) {
    if (poll.status !== 'draft') {
      return NextResponse.json({ error: 'Can only edit polls in draft status' }, { status: 400 })
    }

    const updated = await prisma.poll.update({
      where: { slug },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
      },
      include: { options: { orderBy: { order: 'asc' } } },
    })

    if (options !== undefined) {
      await prisma.pollOption.deleteMany({ where: { pollId: poll.id } })
      await prisma.pollOption.createMany({
        data: options.map((opt, i) => ({
          pollId: poll.id,
          label: opt.label,
          order: i,
        })),
      })
    }

    return NextResponse.json(updated)
  }

  // Status transition
  if (!status || !validTransitions[poll.status].includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${poll.status} to ${status}` },
      { status: 400 },
    )
  }

  const updated = await prisma.poll.update({
    where: { slug },
    data: { status },
    include: { options: { orderBy: { order: 'asc' } } },
  })

  await auditLog({
    pollId: poll.id,
    action: status === 'open' ? 'poll_opened' : 'poll_closed',
  })

  return NextResponse.json(updated)
}
