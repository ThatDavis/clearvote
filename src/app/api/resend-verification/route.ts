import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { sendVerificationEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/token'

export async function POST(request: Request) {
  const body = await request.json()
  const { email } = body as { email?: string }

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (user.emailVerified) {
    return NextResponse.json({ error: 'Email is already verified' }, { status: 400 })
  }

  // Delete any existing tokens for this user
  await prisma.emailVerificationToken.deleteMany({
    where: { userId: user.id },
  })

  // Generate new token
  const token = randomBytes(32).toString('hex')
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  })

  const verifyLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify?token=${token}`
  await sendVerificationEmail({ to: user.email, verifyLink })

  return NextResponse.json({ success: true })
}
