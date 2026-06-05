import { hash } from 'bcryptjs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/token'

export async function POST(request: Request) {
  const body = await request.json()
  const { token, name, password } = body as {
    token?: string
    name?: string
    password?: string
  }

  if (!token) {
    return NextResponse.json({ error: 'Invite token is required' }, { status: 400 })
  }

  const invite = await prisma.organizationInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { organization: true },
  })

  if (!invite) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 400 })
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
  }

  // Check if user already exists (they may have signed up since the invite was sent)
  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
  })

  if (existingUser) {
    // Just add them to the org
    const alreadyMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: existingUser.id,
          organizationId: invite.organizationId,
        },
      },
    })

    if (alreadyMember) {
      await prisma.organizationInvite.delete({ where: { id: invite.id } })
      return NextResponse.json({ error: 'You are already a member of this organization' }, { status: 409 })
    }

    await prisma.organizationMember.create({
      data: {
        userId: existingUser.id,
        organizationId: invite.organizationId,
        role: 'member',
      },
    })

    await prisma.organizationInvite.delete({ where: { id: invite.id } })

    return NextResponse.json({
      success: true,
      email: invite.email,
      orgName: invite.organization.name,
      joined: true,
    })
  }

  // Need to create a new user
  if (!name || !password) {
    return NextResponse.json({ error: 'Name and password are required' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const passwordHash = await hash(password, 12)

  const user = await prisma.user.create({
    data: {
      email: invite.email,
      name,
      passwordHash,
    },
  })

  await prisma.organizationMember.create({
    data: {
      userId: user.id,
      organizationId: invite.organizationId,
      role: 'member',
    },
  })

  await prisma.organizationInvite.delete({ where: { id: invite.id } })

  return NextResponse.json({
    success: true,
    email: invite.email,
    orgName: invite.organization.name,
    joined: true,
  })
}
