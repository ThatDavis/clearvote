import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function generateReceipt(ballotId: string): string {
  const secret = process.env.AUTH_SECRET || 'dev-secret'
  return createHash('sha256').update(`${ballotId}:${secret}`).digest('hex').slice(0, 12)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { pollSlug, token, rankings } = body as {
      pollSlug?: string
      token?: string
      rankings?: string[]
    }

    if (!pollSlug || !token) {
      return NextResponse.json({ error: 'Poll slug and token are required' }, { status: 400 })
    }

    if (!rankings || !Array.isArray(rankings) || rankings.length === 0) {
      return NextResponse.json({ error: 'At least one ranking is required' }, { status: 400 })
    }

    // Validate poll exists and is open
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

    // Validate token
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

    // Validate all ranking IDs are valid options for this poll
    const optionIds = new Set(poll.options.map((o) => o.id))
    for (const id of rankings) {
      if (!optionIds.has(id)) {
        return NextResponse.json({ error: 'Invalid option in rankings' }, { status: 400 })
      }
    }

    // Create ballot and mark token used in a transaction
    const ballot = await prisma.$transaction(async (tx) => {
      const b = await tx.ballot.create({
        data: {
          pollId: poll.id,
          voterToken: token,
          rankings: rankings as unknown as string[],
          receiptCode: '', // placeholder, will update after getting the ID
        },
      })

      const receipt = generateReceipt(b.id)

      const updated = await tx.ballot.update({
        where: { id: b.id },
        data: { receiptCode: receipt },
      })

      await tx.voterToken.update({
        where: { id: voterToken.id },
        data: { usedAt: new Date() },
      })

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
