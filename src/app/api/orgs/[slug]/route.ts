import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      users: {
        select: { id: true, name: true, email: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const isMember = session?.user?.organizationId === org.id

  return NextResponse.json({ ...org, isMember })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const org = await prisma.organization.findUnique({ where: { slug } })
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  if (session?.user?.organizationId !== org.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = await request.json()
  const { name } = body as { name?: string }

  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const updated = await prisma.organization.update({
    where: { slug },
    data: { name: name.trim() },
  })

  return NextResponse.json(updated)
}
