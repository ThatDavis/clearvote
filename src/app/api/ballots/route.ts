import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { audit } from '@/lib/audit'
import { sendVoteConfirmation } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { hashToken } from '@/lib/token'
import { getMethod } from '@/lib/voting-methods'

class AlreadyVotedError extends Error {}

function generateReceipt(): string {
  return randomBytes(16).toString('hex')
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
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
    const { pollSlug, token, rankings, email } = body as {
      pollSlug?: string
      token?: string
      rankings?: string[] | Record<string, string>
      email?: string
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

    if (poll.electionId) {
      return NextResponse.json(
        { error: 'This poll is a contest within an election; vote via the election ballot.' },
        { status: 400 },
      )
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

    const validated = getMethod(poll.votingMethod).validateBallot(
      rankings,
      poll.options,
    )
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
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
          rankings: validated.value as unknown as string[],
          receiptCode: receipt,
        },
      })

      await audit({
        kind: 'poll',
        entityId: poll.id,
        action: 'ballot_cast',
        detail: `Ballot cast at ${new Date().toISOString()}`,
        tx,
      })

      return b
    })

    // Send the confirmation AFTER the vote is committed, best-effort. A failed or
    // slow email must never roll back or block a recorded vote.
    //
    // Ballot secrecy depends on never persisting or logging a link between the
    // recipient and the receipt/ballot. We resolve the recipient transiently here
    // and send; nothing connecting the address to this ballot is stored or logged.
    let recipient: string | null = null
    if (token) {
      // Anonymous voter: only email if they explicitly supplied a valid address.
      if (typeof email === 'string' && isValidEmail(email.trim())) {
        recipient = email.trim()
      }
    } else if (session?.user?.id) {
      // Registered voter: auto-send to their account email (fetched here, not stored).
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true },
      })
      recipient = user?.email ?? null
    }

    let emailed = false
    if (recipient) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const result = await sendVoteConfirmation({
          to: recipient,
          pollTitle: poll.title,
          receiptCode: ballot.receiptCode,
          verifyLink: `${appUrl}/verify?code=${ballot.receiptCode}`,
          castAt: ballot.castAt,
        })
        emailed = result.success
      } catch {
        // Best-effort only. Deliberately do not log the recipient or receipt here -
        // that pairing is exactly what must never be recorded.
        console.error('Vote confirmation email failed to send')
      }
    }

    return NextResponse.json(
      {
        id: ballot.id,
        receiptCode: ballot.receiptCode,
        castAt: ballot.castAt,
        emailed,
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
