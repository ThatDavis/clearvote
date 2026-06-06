import type { NextResponse } from 'next/server'
import { canManagePoll } from '@/lib/auth'
import { canManageElection } from '@/lib/election'
import { prisma } from '@/lib/prisma'
import { notFound, unauthorized } from './responses'

export async function requireManager(
  kind: 'poll' | 'election',
  slug: string,
  userId: string,
): Promise<
  | { poll: Awaited<ReturnType<typeof prisma.poll.findUnique>> }
  | { election: Awaited<ReturnType<typeof prisma.election.findUnique>> }
  | NextResponse
> {
  if (kind === 'poll') {
    const poll = await prisma.poll.findUnique({ where: { slug } })
    if (!poll) return notFound()
    if (!(await canManagePoll(poll.id, userId))) return unauthorized()
    return { poll }
  }
  const election = await prisma.election.findUnique({ where: { slug } })
  if (!election) return notFound()
  if (!(await canManageElection(election.id, userId))) return unauthorized()
  return { election }
}

export async function requireOrgAdmin(
  orgId: string,
  userId: string,
): Promise<boolean> {
  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  })
  return membership?.role === 'admin'
}

const validTransitions: Record<string, string[]> = {
  draft: ['open'],
  open: ['closed'],
  closed: [],
}

export function assertTransition(current: string, next: string): void {
  if (!validTransitions[current]?.includes(next)) {
    throw new Error(`Invalid status transition: ${current} -> ${next}`)
  }
}
