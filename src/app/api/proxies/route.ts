import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await request.json()
  const { pollSlug, proxyEmail } = body as {
    pollSlug?: string
    proxyEmail?: string
  }

  if (!pollSlug || !proxyEmail) {
    return NextResponse.json({ error: 'Poll slug and proxy email are required' }, { status: 400 })
  }

  const poll = await prisma.poll.findUnique({ where: { slug: pollSlug } })
  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  }

  const proxyUser = await prisma.user.findUnique({
    where: { email: proxyEmail.toLowerCase().trim() },
  })
  if (!proxyUser) {
    return NextResponse.json({ error: 'No user found with that email' }, { status: 404 })
  }

  if (proxyUser.id === session.user.id) {
    return NextResponse.json({ error: 'You cannot proxy to yourself' }, { status: 400 })
  }

  const existing = await prisma.proxy.findUnique({
    where: {
      pollId_principalId: {
        pollId: poll.id,
        principalId: session.user.id,
      },
    },
  })

  if (existing) {
    await prisma.proxy.update({
      where: { id: existing.id },
      data: { proxyId: proxyUser.id },
    })
  } else {
    await prisma.proxy.create({
      data: {
        pollId: poll.id,
        principalId: session.user.id,
        proxyId: proxyUser.id,
      },
    })
  }

  return NextResponse.json({ success: true, proxy: proxyUser.name }, { status: 201 })
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await request.json()
  const { pollSlug } = body as { pollSlug?: string }

  if (!pollSlug) {
    return NextResponse.json({ error: 'Poll slug is required' }, { status: 400 })
  }

  const poll = await prisma.poll.findUnique({ where: { slug: pollSlug } })
  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  }

  await prisma.proxy.deleteMany({
    where: {
      pollId: poll.id,
      principalId: session.user.id,
    },
  })

  return NextResponse.json({ success: true })
}
