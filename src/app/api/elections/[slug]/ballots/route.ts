import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { audit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { hashToken } from '@/lib/token'
import { getMethod } from '@/lib/voting-methods'

class AlreadyVotedError extends Error {}

function generateReceipt(): string {
  return randomBytes(16).toString('hex')
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params

    // Rate limit: 10 ballots per IP per minute
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const limit = rateLimit({ key: `election-ballot:${ip}`, max: 10, windowMs: 60_000 })
    if (!limit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 },
      )
    }

    const session = await auth()
    const body = await request.json()
    const { token, contests } = body as {
      token?: string
      contests?: { pollId: string; rankings: unknown }[]
    }

    if (!contests || !Array.isArray(contests) || contests.length === 0) {
      return NextResponse.json({ error: 'Contests array is required' }, { status: 400 })
    }

    const election = await prisma.election.findUnique({
      where: { slug },
      include: {
        contests: {
          include: { options: true },
        },
      },
    })

    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 })
    }

    // Auto-close if past end date
    if (election.status === 'open' && election.endsAt && new Date(election.endsAt) < new Date()) {
      await prisma.election.update({
        where: { id: election.id },
        data: { status: 'closed' },
      })
      election.status = 'closed'
    }

    if (election.status !== 'open') {
      return NextResponse.json({ error: 'This election is not accepting ballots' }, { status: 400 })
    }

    // Build contest map for validation
    const contestMap = new Map(election.contests.map((c) => [c.id, c]))
    const validatedBallots = new Map<string, unknown>()

    // Validate every contest selection before the transaction
    for (const contestSubmission of contests) {
      const contest = contestMap.get(contestSubmission.pollId)
      if (!contest) {
        return NextResponse.json(
          { error: `Invalid contest: ${contestSubmission.pollId}` },
          { status: 400 },
        )
      }

      const rankings = contestSubmission.rankings
      const validated = getMethod(contest.votingMethod).validateBallot(
        rankings,
        contest.options,
      )
      if (!validated.ok) {
        return NextResponse.json(
          { error: `${validated.error} in contest: ${contest.title}` },
          { status: 400 },
        )
      }
      validatedBallots.set(contest.id, validated.value)
    }

    // Determine which contests the voter is entitled to (v1 = all contests)
    const entitledContestIds = new Set(election.contests.map((c) => c.id))

    // Reject if body contains any contest not in the entitled set
    for (const c of contests) {
      if (!entitledContestIds.has(c.pollId)) {
        return NextResponse.json(
          { error: `Contest not in voter's ballot: ${c.pollId}` },
          { status: 400 },
        )
      }
    }

    // Atomically claim credential and create ballots
    const result = await prisma.$transaction(async (tx) => {
      if (token) {
        const tokenHash = hashToken(token)
        const claimed = await tx.electionVoterToken.updateMany({
          where: {
    
            tokenHash,
            usedAt: null,
          },
          data: { usedAt: new Date() },
        })
        if (claimed.count !== 1) throw new AlreadyVotedError()
      } else if (session?.user?.id) {
        const claimed = await tx.electionVoterRoll.updateMany({
          where: {
    
            userId: session.user.id,
            hasVoted: false,
          },
          data: { hasVoted: true, votedAt: new Date() },
        })
        if (claimed.count !== 1) throw new AlreadyVotedError()
      } else {
        throw new Error('A voting token or authenticated session is required')
      }

      // Create one Ballot per entitled contest
      for (const contest of election.contests) {
        const rankings =
          validatedBallots.get(contest.id) ??
          getMethod(contest.votingMethod).emptyBallot()

        await tx.ballot.create({
          data: {
            pollId: contest.id,
            rankings: rankings as unknown as string[],
            receiptCode: generateReceipt(), // per-ballot receipt (not linked to package)
          },
        })
      }

      // Create one ElectionReceipt for the package
      const receiptCode = generateReceipt()
      const receipt = await tx.electionReceipt.create({
        data: {
          electionId: election.id,
          receiptCode,
        },
      })

      await audit({
        kind: 'election',
        entityId: election.id,
        action: 'ballot_cast',
        detail: `Ballot cast at ${new Date().toISOString()}`,
        tx,
      })

      return { receiptCode: receipt.receiptCode, castAt: receipt.castAt }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof AlreadyVotedError) {
      return NextResponse.json(
        { error: 'You have already voted in this election' },
        { status: 409 },
      )
    }
    console.error('Election ballot creation error:', error)
    return NextResponse.json({ error: 'Failed to cast ballot' }, { status: 500 })
  }
}
