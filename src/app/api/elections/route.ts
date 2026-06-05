import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { uniqueSlug } from '@/lib/slug'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, organizationId, startsAt, endsAt } = body as {
      title?: string
      description?: string
      organizationId?: string
      startsAt?: string
      endsAt?: string
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // If organizationId is provided, verify the user is an admin
    if (organizationId) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: session.user.id,
            organizationId,
          },
        },
      })
      if (membership?.role !== 'admin') {
        return NextResponse.json(
          { error: 'You must be an admin of this organization' },
          { status: 403 },
        )
      }
    }

    const slug = await uniqueSlug(title.trim())

    const election = await prisma.election.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        slug,
        creatorId: session.user.id,
        organizationId: organizationId ?? null,
        startsAt: startsAt ? new Date(startsAt + 'T00:00:00Z') : null,
        endsAt: endsAt ? new Date(endsAt + 'T00:00:00Z') : null,
      },
    })

    return NextResponse.json(election, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create election' }, { status: 500 })
  }
}

export async function GET() {
  const elections = await prisma.election.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      contests: {
        orderBy: { contestOrder: 'asc' },
      },
      _count: {
        select: { contests: true, tokens: true, rolls: true },
      },
    },
  })

  return NextResponse.json(elections)
}
