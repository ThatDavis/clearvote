import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { canManagePoll } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const poll = await prisma.poll.findUnique({ where: { slug } })
  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  }

  const roll = await prisma.voterRoll.findMany({
    where: { pollId: poll.id },
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

  const poll = await prisma.poll.findUnique({ where: { slug } })
  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  }

  if (session?.user?.id && !(await canManagePoll(poll.id, session.user.id))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  if (poll.status !== 'draft') {
    return NextResponse.json({ error: 'Cannot modify voter roll after poll is open' }, { status: 400 })
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

  const existing = await prisma.voterRoll.findUnique({
    where: {
      pollId_userId: {
        pollId: poll.id,
        userId: user.id,
      },
    },
  })

  if (existing) {
    return NextResponse.json({ error: 'User is already on the voter roll' }, { status: 409 })
  }

  const entry = await prisma.voterRoll.create({
    data: {
      pollId: poll.id,
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

  const poll = await prisma.poll.findUnique({ where: { slug } })
  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  }

  if (session?.user?.id && !(await canManagePoll(poll.id, session.user.id))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  if (poll.status !== 'draft') {
    return NextResponse.json({ error: 'Cannot modify voter roll after poll is open' }, { status: 400 })
  }

  const body = await request.json()
  const { userId } = body as { userId?: string }

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  await prisma.voterRoll.deleteMany({
    where: {
      pollId: poll.id,
      userId,
    },
  })

  return NextResponse.json({ success: true })
}
