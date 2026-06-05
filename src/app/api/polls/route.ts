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
    const {
      title,
      description,
      options,
      votingMethod,
      seats,
      threshold,
      startsAt,
      endsAt,
      organizationId,
    } = body as {
      title?: string
      description?: string
      options?: string[]
      votingMethod?: string
      seats?: number
      threshold?: number
      startsAt?: string
      endsAt?: string
      organizationId?: string
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const minOptions = votingMethod === 'yesno' ? 1 : 2
    if (!options || !Array.isArray(options) || options.length < minOptions) {
      return NextResponse.json({ error: `At least ${minOptions} option${minOptions === 1 ? '' : 's'} are required` }, { status: 400 })
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

    const poll = await prisma.$transaction(async (tx) => {
      const p = await tx.poll.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          slug,
          votingMethod: votingMethod || 'rcv',
          seats: seats || 1,
          threshold: threshold ?? 50,
          startsAt: startsAt ? new Date(startsAt) : null,
          endsAt: endsAt ? new Date(endsAt) : null,
          creatorId: session.user.id,
          organizationId: organizationId ?? null,
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

      return p
    })

    return NextResponse.json(poll, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 })
  }
}
