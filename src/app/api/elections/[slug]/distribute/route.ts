import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { canManageElection } from '@/lib/election'
import { sendVoteInvite } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/token'

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const election = await prisma.election.findUnique({
    where: { slug },
    include: { organization: true },
  })
  if (!election) {
    return NextResponse.json({ error: 'Election not found' }, { status: 404 })
  }

  if (!session?.user?.id || !(await canManageElection(election.id, session.user.id))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  if (election.status !== 'draft') {
    return NextResponse.json(
      { error: 'Cannot modify voter roll after election is open' },
      { status: 400 },
    )
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Handle personal emails
  if (emails && emails.length > 0) {
    for (const email of emails) {
      const normalizedEmail = email.toLowerCase().trim()
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      })

      if (user) {
        try {
          await prisma.electionVoterRoll.create({
            data: {
              electionId: election.id,
              userId: user.id,
            },
          })
          results.addedToRoll.push(normalizedEmail)
        } catch {
          results.addedToRoll.push(normalizedEmail)
        }
      } else {
        const token = randomBytes(32).toString('hex')
        await prisma.electionVoterToken.create({
          data: {
            electionId: election.id,
            tokenHash: hashToken(token),
          },
        })
        results.tokensGenerated.push({ email: normalizedEmail, token })

        const voteLink = `${baseUrl}/elect/${slug}?token=${token}`
        const emailResult = await sendVoteInvite({
          to: normalizedEmail,
          pollTitle: election.title,
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
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        results.errors.push(`User ${userId} not found`)
        continue
      }

      try {
        await prisma.electionVoterRoll.create({
          data: {
            electionId: election.id,
            userId,
          },
        })

        const voteLink = `${baseUrl}/elect/${slug}`
        await sendVoteInvite({
          to: user.email,
          pollTitle: election.title,
          voteLink,
        })
        results.emailsSent.push(user.email)
        results.addedToRoll.push(userId)
      } catch {
        results.addedToRoll.push(userId)
      }
    }
  }

  return NextResponse.json(results)
}
