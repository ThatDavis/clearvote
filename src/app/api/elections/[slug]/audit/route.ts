import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { notFound, unauthorized } from '@/lib/api/responses'
import { canManageElection } from '@/lib/election'
import { prisma } from '@/lib/prisma'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const election = await prisma.election.findUnique({ where: { slug } })
  if (!election) return notFound()
  if (!session?.user?.id || !(await canManageElection(election.id, session.user.id))) {
    return unauthorized()
  }

  const auditLogs = await prisma.electionAuditLog.findMany({
    where: { electionId: election.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(auditLogs)
}
