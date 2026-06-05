import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { canManageElection } from '@/lib/election'
import { prisma } from '@/lib/prisma'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const election = await prisma.election.findUnique({ where: { slug } })
  if (!election) {
    return NextResponse.json({ error: 'Election not found' }, { status: 404 })
  }

  if (!session?.user?.id || !(await canManageElection(election.id, session.user.id))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const auditLogs = await prisma.electionAuditLog.findMany({
    where: { electionId: election.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(auditLogs)
}
