import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { auditLog } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { hashToken } from '@/lib/token'

class AlreadyVotedError extends Error {}

function generateReceipt(): string {
  return randomBytes(16).toString('hex')
}

export async function POST(request: Request) {
  try {
    // Rate limit: 10 ballots per IP per minute
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const limit = rateLimit({ key: `ballot:${ip}`, max: 10, windowMs: 60_000 })
    if (!limit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 },
      )
    }

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
        return NextResponse.json(
          { error: 'Invalid rankings format for yes/no poll' },
          { status: 400 },
        )
      }
      const validVotes = new Set(['yes', 'no', 'abstain'])
      for (const [id, vote] of Object.entries(rankings)) {
        if (!optionIds.has(id) || !validVotes.has(vote)) {
          return NextResponse.json(
            { error: 'Invalid option or vote value in rankings' },
            { status: 400 },
          )
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
      const tokenHash = hashToken(token)
      const voterToken = await prisma.voterToken.findUnique({
        where: {
          pollId_tokenHash: {
            pollId: poll.id,
            tokenHash,
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
      // Atomically claim the voting credential. The `where` guard ensures
      // only one of N concurrent requests for the same credential succeeds.
      if (token) {
        const tokenHash = hashToken(token)
        const claimed = await tx.voterToken.updateMany({
          where: { pollId: poll.id, tokenHash, usedAt: null },
          data: { usedAt: new Date() },
        })
        if (claimed.count !== 1) throw new AlreadyVotedError()
      } else if (session?.user?.id) {
        const claimed = await tx.voterRoll.updateMany({
          where: { pollId: poll.id, userId: session.user.id, hasVoted: false },
          data: { hasVoted: true, votedAt: new Date() },
        })
        if (claimed.count !== 1) throw new AlreadyVotedError()
      }

      const receipt = generateReceipt()
      const b = await tx.ballot.create({
        data: {
          pollId: poll.id,
          rankings: rankings as unknown as string[],
          receiptCode: receipt,
        },
      })

      await auditLog({
        pollId: poll.id,
        action: 'ballot_cast',
        detail: `Ballot cast at ${new Date().toISOString()}`,
        tx,
      })

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
    if (error instanceof AlreadyVotedError) {
      return NextResponse.json({ error: 'You have already voted in this poll' }, { status: 409 })
    }
    console.error('Ballot creation error:', error)
    return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 })
  }
}
