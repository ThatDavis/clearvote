import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { requireSystemAdmin } from '@/lib/api/guards'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isAdmin = await requireSystemAdmin(session.user.id)
  if (!isAdmin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { userId } = await params

  // Prevent self-deletion
  if (userId === session.user.id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Deleting a User cascades: OrganizationMember, VoterRoll, ElectionVoterRoll,
  // and EmailVerificationToken (all onDelete: Cascade).
  // Ballot and ContestBallot have NO userId FK - they are anonymous and survive
  // the deletion untouched. Poll/Election/Contest creator relations are nullable
  // (onDelete: Set Null), so those entities survive with a null creator.
  await prisma.user.delete({
    where: { id: userId },
  })

  return NextResponse.json({ success: true })
}
