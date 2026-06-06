import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const org = await prisma.organization.findUnique({ where: { slug } })
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: org.id,
      },
    },
  })

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 })
  }

  await prisma.organizationMember.delete({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId: org.id,
      },
    },
  })

  return NextResponse.json({ success: true })
}
