import { prisma } from '@/lib/prisma'

export async function canManagePoll(pollId: string, userId: string): Promise<boolean> {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    select: { creatorId: true, organizationId: true },
  })

  if (!poll) return false

  // Creator always can manage
  if (poll.creatorId === userId) return true

  // Org admins can manage org polls
  if (poll.organizationId) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: poll.organizationId,
        },
      },
    })
    if (membership?.role === 'admin') return true
  }

  return false
}
