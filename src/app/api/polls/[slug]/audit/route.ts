import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { notFound, unauthorized } from '@/lib/api/responses'
import { canManagePoll } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const poll = await prisma.poll.findUnique({ where: { slug } })
  if (!poll) return notFound()
  if (!session?.user?.id || !(await canManagePoll(poll.id, session.user.id))) {
    return unauthorized()
  }

  const logs = await prisma.auditLog.findMany({
    where: { pollId: poll.id },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ logs })
}
