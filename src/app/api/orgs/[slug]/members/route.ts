import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function isOrgAdmin(userId: string, orgId: string): Promise<boolean> {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: orgId,
      },
    },
  })
  return membership?.role === 'admin'
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const org = await prisma.organization.findUnique({ where: { slug } })
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  // Any member can view the member list
  const isMember = session?.user?.memberships?.some((m) => m.organizationId === org.id)
  if (!isMember) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: org.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(members)
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const org = await prisma.organization.findUnique({ where: { slug } })
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  if (!session?.user?.id || !(await isOrgAdmin(session.user.id, org.id))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = await request.json()
  const { email } = body as { email?: string }

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (!user) {
    // User doesn't exist yet — we could send an invite email here
    // For now, return a specific error so the UI can show a "send invite" option
    return NextResponse.json(
      { error: 'No user found with that email', invite: true },
      { status: 404 },
    )
  }

  // Check if already a member
  const existing = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: org.id,
      },
    },
  })

  if (existing) {
    return NextResponse.json(
      { error: 'This user is already a member of this organization' },
      { status: 409 },
    )
  }

  const member = await prisma.organizationMember.create({
    data: {
      userId: user.id,
      organizationId: org.id,
      role: 'member',
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({ id: member.id, user: member.user, role: member.role }, { status: 201 })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const org = await prisma.organization.findUnique({ where: { slug } })
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const body = await request.json()
  const { userId } = body as { userId?: string }

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: session?.user?.id ?? '',
        organizationId: org.id,
      },
    },
  })

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 })
  }

  // Only admins can remove others; anyone can remove themselves
  if (userId !== session?.user?.id && membership.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  await prisma.organizationMember.delete({
    where: {
      userId_organizationId: {
        userId,
        organizationId: org.id,
      },
    },
  })

  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const org = await prisma.organization.findUnique({ where: { slug } })
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  if (!session?.user?.id || !(await isOrgAdmin(session.user.id, org.id))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = await request.json()
  const { userId, role } = body as { userId?: string; role?: string }

  if (!userId || !role || !['admin', 'member'].includes(role)) {
    return NextResponse.json({ error: 'User ID and valid role required' }, { status: 400 })
  }

  const updated = await prisma.organizationMember.update({
    where: {
      userId_organizationId: {
        userId,
        organizationId: org.id,
      },
    },
    data: { role },
  })

  return NextResponse.json(updated)
}
