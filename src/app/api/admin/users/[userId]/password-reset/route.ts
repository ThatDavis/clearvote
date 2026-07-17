import { randomBytes } from 'node:crypto'
import { hash } from 'bcryptjs'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { requireSystemAdmin } from '@/lib/api/guards'
import { prisma } from '@/lib/prisma'

export async function POST(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isAdmin = await requireSystemAdmin(session.user.id)
  if (!isAdmin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { userId } = await params

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Generate a random temporary password (16 chars, alphanumeric)
  const tempPassword = randomBytes(8).toString('base64url')

  const passwordHash = await hash(tempPassword, 12)
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  })

  // Return the temp password to the admin. It is never logged or emailed.
  // The admin must share it with the user out-of-band.
  return NextResponse.json({ tempPassword })
}
