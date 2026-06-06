import { prisma } from '@/lib/prisma'

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
