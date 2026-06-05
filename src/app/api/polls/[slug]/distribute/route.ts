import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { canManagePoll } from '@/lib/auth'
import { sendVoteInvite } from '@/lib/email'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const poll = await prisma.poll.findUnique({
    where: { slug },
    include: {
      organization: true,
    },
  })

  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  }

  if (!session?.user?.id || !(await canManagePoll(poll.id, session.user.id))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  if (poll.status !== 'draft') {
    return NextResponse.json({ error: 'Cannot modify voter roll after poll is open' }, { status: 400 })
  }

  const body = await request.json()
  const { emails, memberIds } = body as {
    emails?: string[]
    memberIds?: string[]
  }

  if ((!emails || emails.length === 0) && (!memberIds || memberIds.length === 0)) {
    return NextResponse.json({ error: 'No recipients provided' }, { status: 400 })
  }

  const results = {
    addedToRoll: [] as string[],
    tokensGenerated: [] as { email: string; token: string }[],
    emailsSent: [] as string[],
    errors: [] as string[],
  }

  // Handle personal poll emails
  if (emails && emails.length > 0) {
    for (const email of emails) {
      const normalizedEmail = email.toLowerCase().trim()

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      })

      if (user) {
        // Add to voter roll
        try {
          await prisma.voterRoll.create({
            data: {
              pollId: poll.id,
              userId: user.id,
            },
          })
          results.addedToRoll.push(normalizedEmail)
        } catch {
          // Already on roll
          results.addedToRoll.push(normalizedEmail)
        }
      } else {
        // Generate token for non-registered user
        const token = randomUUID()
        await prisma.voterToken.create({
          data: {
            pollId: poll.id,
            token,
          },
        })
        results.tokensGenerated.push({ email: normalizedEmail, token })

        // Send email
        const voteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/vote/${slug}?token=${token}`
        const emailResult = await sendVoteInvite({
          to: normalizedEmail,
          pollTitle: poll.title,
          voteLink,
        })

        if (emailResult.success) {
          results.emailsSent.push(normalizedEmail)
        } else {
          results.errors.push(`Failed to send email to ${normalizedEmail}`)
        }
      }
    }
  }

  // Handle org memberIds
  if (memberIds && memberIds.length > 0) {
    for (const userId of memberIds) {
      try {
        await prisma.voterRoll.create({
          data: {
            pollId: poll.id,
            userId,
          },
        })

        // Get user email for notification
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        })

        if (user) {
          const voteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/vote/${slug}`
          await sendVoteInvite({
            to: user.email,
            pollTitle: poll.title,
            voteLink,
          })
          results.emailsSent.push(user.email)
        }

        results.addedToRoll.push(userId)
      } catch {
        // Already on roll
        results.addedToRoll.push(userId)
      }
    }
  }

  return NextResponse.json(results)
}
