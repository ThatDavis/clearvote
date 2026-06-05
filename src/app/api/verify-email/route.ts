import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/token'

export async function POST(request: Request) {
  const body = await request.json()
  const { token } = body as { token?: string }

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 })
  }

  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
  })

  if (!verificationToken) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
  }

  if (verificationToken.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Token has expired' }, { status: 400 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: new Date() },
    })

    await tx.emailVerificationToken.delete({
      where: { id: verificationToken.id },
    })
  })

  return NextResponse.json({ success: true })
}
