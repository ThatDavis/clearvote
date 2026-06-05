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
    const { title, description, options } = body as {
      title?: string
      description?: string
      options?: string[]
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json({ error: 'At least 2 options are required' }, { status: 400 })
    }

    const slug = await uniqueSlug(title.trim())

    const poll = await prisma.poll.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        slug,
        creatorId: session.user.id,
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

    return NextResponse.json(poll, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 })
  }
}
