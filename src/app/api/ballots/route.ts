import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

function generateReceipt(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET is required for receipt generation')
  }
  return randomBytes(16).toString('hex')
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const body = await request.json()
    const { pollSlug, token, rankings } = body as {
      pollSlug?: string
      token?: string
      rankings?: string[] | Record<string, string>
    }

    if (!pollSlug) {
      return NextResponse.json({ error: 'Poll slug is required' }, { status: 400 })
    }

    if (!rankings) {
      return NextResponse.json({ error: 'At least one ranking is required' }, { status: 400 })
    }

    const poll = await prisma.poll.findUnique({
      where: { slug: pollSlug },
      include: { options: true },
    })

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    // Auto-close if past end date
    if (poll.status === 'open' && poll.endsAt && new Date(poll.endsAt) < new Date()) {
      await prisma.poll.update({
        where: { id: poll.id },
        data: { status: 'closed' },
      })
      poll.status = 'closed'
    }

    if (poll.status !== 'open') {
      return NextResponse.json({ error: 'This poll is not accepting votes' }, { status: 400 })
    }

    const optionIds = new Set(poll.options.map((o) => o.id))

    if (poll.votingMethod === 'yesno') {
      if (typeof rankings !== 'object' || Array.isArray(rankings)) {
        return NextResponse.json({ error: 'Invalid rankings format for yes/no poll' }, { status: 400 })
      }
      const validVotes = new Set(['yes', 'no', 'abstain'])
      for (const [id, vote] of Object.entries(rankings)) {
        if (!optionIds.has(id) || !validVotes.has(vote)) {
          return NextResponse.json({ error: 'Invalid option or vote value in rankings' }, { status: 400 })
        }
      }
    } else {
      if (!Array.isArray(rankings) || rankings.length === 0) {
        return NextResponse.json({ error: 'At least one ranking is required' }, { status: 400 })
      }
      for (const id of rankings) {
        if (!optionIds.has(id)) {
          return NextResponse.json({ error: 'Invalid option in rankings' }, { status: 400 })
        }
      }
    }

    if (token) {
      // Token-based voting (anonymous)
      const voterToken = await prisma.voterToken.findUnique({
        where: {
          pollId_token: {
            pollId: poll.id,
            token,
          },
        },
      })

      if (!voterToken) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
      }

      if (voterToken.usedAt) {
        return NextResponse.json({ error: 'This token has already been used' }, { status: 409 })
      }
    } else if (session?.user?.id) {
      // Authenticated voting
      const onRoll = await prisma.voterRoll.findUnique({
        where: {
          pollId_userId: {
            pollId: poll.id,
            userId: session.user.id,
          },
        },
      })

      if (!onRoll) {
        return NextResponse.json(
          { error: 'You are not on the voter roll for this poll' },
          { status: 403 },
        )
      }

      if (onRoll.hasVoted) {
        return NextResponse.json({ error: 'You have already voted in this poll' }, { status: 409 })
      }
    } else {
      return NextResponse.json(
        { error: 'A voting token or authenticated session is required' },
        { status: 401 },
      )
    }

    const ballot = await prisma.$transaction(async (tx) => {
      const receipt = generateReceipt()

      const b = await tx.ballot.create({
        data: {
          pollId: poll.id,
          rankings: rankings as unknown as string[],
          receiptCode: receipt,
        },
      })

      if (token) {
        await tx.voterToken.update({
          where: {
            pollId_token: {
              pollId: poll.id,
              token,
            },
          },
          data: { usedAt: new Date() },
        })
      } else if (session?.user?.id) {
        await tx.voterRoll.update({
          where: {
            pollId_userId: {
              pollId: poll.id,
              userId: session.user.id,
            },
          },
          data: { hasVoted: true, votedAt: new Date() },
        })
      }

      return b
    })

    return NextResponse.json(
      {
        id: ballot.id,
        receiptCode: ballot.receiptCode,
        castAt: ballot.castAt,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Ballot creation error:', error)
    return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 })
  }
}
