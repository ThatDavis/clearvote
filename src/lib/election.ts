import { prisma } from '@/lib/prisma'

interface ElectionLike {
  status?: string | null
  startsAt?: Date | null
  endsAt?: Date | null
}

interface PollLike {
  status: string
  startsAt: Date | null
  endsAt: Date | null
  election?: ElectionLike | null
}

export function effectiveStatus(poll: PollLike): string {
  return poll.election?.status ?? poll.status
}

export function effectiveWindow(poll: PollLike): {
  startsAt: Date | null
  endsAt: Date | null
} {
  return {
    startsAt: poll.election?.startsAt ?? poll.startsAt,
    endsAt: poll.election?.endsAt ?? poll.endsAt,
  }
}

export async function canManageElection(electionId: string, userId: string): Promise<boolean> {
  const election = await prisma.election.findUnique({
    where: { id: electionId },
    select: { creatorId: true, organizationId: true },
  })

  if (!election) return false

  if (election.creatorId === userId) return true

  if (election.organizationId) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: election.organizationId,
        },
      },
    })
    if (membership?.role === 'admin') return true
  }

  return false
}
