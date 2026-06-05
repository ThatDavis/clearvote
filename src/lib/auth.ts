import { prisma } from '@/lib/prisma'

export async function canManagePoll(pollId: string, userId: string): Promise<boolean> {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    select: { creatorId: true, organizationId: true },
  })

  if (!poll) return false

  // Creator always can manage
  if (poll.creatorId === userId) return true

  // Org members can manage org polls
  if (poll.organizationId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    })
    if (user?.organizationId === poll.organizationId) return true
  }

  return false
}
