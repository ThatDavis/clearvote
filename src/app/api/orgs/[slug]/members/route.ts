import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sendOrgInvite } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/token'

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

  const invites = await prisma.organizationInvite.findMany({
    where: { organizationId: org.id },
    select: { id: true, email: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ members, invites })
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
    // Create an invite for non-registered users
    const existingInvite = await prisma.organizationInvite.findUnique({
      where: {
        email_organizationId: {
          email: normalizedEmail,
          organizationId: org.id,
        },
      },
    })

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An invite has already been sent to this email' },
        { status: 409 },
      )
    }

    const token = randomBytes(32).toString('hex')
    const invite = await prisma.organizationInvite.create({
      data: {
        email: normalizedEmail,
        organizationId: org.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/org/invite?token=${token}`
    await sendOrgInvite({
      to: normalizedEmail,
      orgName: org.name,
      inviteLink,
    })

    return NextResponse.json({ id: invite.id, email: invite.email, invited: true }, { status: 201 })
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
  const { userId, inviteId } = body as { userId?: string; inviteId?: string }

  if (!userId && !inviteId) {
    return NextResponse.json({ error: 'User ID or invite ID is required' }, { status: 400 })
  }

  // Handle invite deletion
  if (inviteId) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session?.user?.id ?? '',
          organizationId: org.id,
        },
      },
    })

    if (membership?.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const invite = await prisma.organizationInvite.findUnique({
      where: { id: inviteId },
    })

    if (!invite || invite.organizationId !== org.id) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    await prisma.organizationInvite.delete({ where: { id: inviteId } })
    return NextResponse.json({ success: true })
  }

  // Handle member deletion
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
        userId: userId,
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
