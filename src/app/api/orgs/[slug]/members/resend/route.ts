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
  const { inviteId } = body as { inviteId?: string }

  if (!inviteId) {
    return NextResponse.json({ error: 'Invite ID is required' }, { status: 400 })
  }

  const invite = await prisma.organizationInvite.findUnique({
    where: { id: inviteId },
  })

  if (!invite || invite.organizationId !== org.id) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  // Generate a new token and update the invite
  const token = randomBytes(32).toString('hex')
  await prisma.organizationInvite.update({
    where: { id: inviteId },
    data: {
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  })

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/org/invite?token=${token}`
  await sendOrgInvite({
    to: invite.email,
    orgName: org.name,
    inviteLink,
  })

  return NextResponse.json({ success: true })
}
