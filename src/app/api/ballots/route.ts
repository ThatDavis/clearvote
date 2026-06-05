import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

function generateReceipt(ballotId: string): string {
  const secret = process.env.AUTH_SECRET || 'dev-secret'
  return createHash('sha256').update(`${ballotId}:${secret}`).digest('hex').slice(0, 12)
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const body = await request.json()
    const { pollSlug, token, rankings } = body as {
      pollSlug?: string
      token?: string
      rankings?: string[]
    }

    if (!pollSlug) {
      return NextResponse.json({ error: 'Poll slug is required' }, { status: 400 })
    }

    if (!rankings || !Array.isArray(rankings) || rankings.length === 0) {
      return NextResponse.json({ error: 'At least one ranking is required' }, { status: 400 })
    }

    const poll = await prisma.poll.findUnique({
      where: { slug: pollSlug },
      include: { options: true },
    })

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    if (poll.status !== 'open') {
      return NextResponse.json({ error: 'This poll is not accepting votes' }, { status: 400 })
    }

    const optionIds = new Set(poll.options.map((o) => o.id))
    for (const id of rankings) {
      if (!optionIds.has(id)) {
        return NextResponse.json({ error: 'Invalid option in rankings' }, { status: 400 })
      }
    }

    let userId: string | null = null
    let voterTokenValue = token || ''

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

      voterTokenValue = token
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

      const alreadyVoted = await prisma.ballot.findFirst({
        where: {
          pollId: poll.id,
          userId: session.user.id,
        },
      })

      if (alreadyVoted) {
        return NextResponse.json({ error: 'You have already voted in this poll' }, { status: 409 })
      }

      userId = session.user.id
    } else {
      return NextResponse.json(
        { error: 'A voting token or authenticated session is required' },
        { status: 401 },
      )
    }

    const ballot = await prisma.$transaction(async (tx) => {
      const b = await tx.ballot.create({
        data: {
          pollId: poll.id,
          userId,
          voterToken: voterTokenValue,
          rankings: rankings as unknown as string[],
          receiptCode: '',
        },
      })

      const receipt = generateReceipt(b.id)

      const updated = await tx.ballot.update({
        where: { id: b.id },
        data: { receiptCode: receipt },
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
      }

      return updated
    })

    return NextResponse.json(
      {
        id: ballot.id,
        receiptCode: ballot.receiptCode,
        castAt: ballot.castAt,
      },
      { status: 201 },
    )
  } catch {
    return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 })
  }
}
