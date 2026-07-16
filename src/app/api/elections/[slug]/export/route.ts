import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { canManageElection } from '@/lib/election'
import { prisma } from '@/lib/prisma'
import { seededShuffle } from '@/lib/shuffle'
import { getMethod } from '@/lib/voting-methods'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const election = await prisma.election.findUnique({
    where: { slug },
    include: {
      contests: {
        orderBy: { contestOrder: 'asc' },
        include: {
          options: { orderBy: { order: 'asc' } },
          ballots: { select: { id: true, rankings: true } },
        },
      },
      auditLogs: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!election) {
    return NextResponse.json({ error: 'Election not found' }, { status: 404 })
  }

  if (!session?.user?.id || !(await canManageElection(election.id, session.user.id))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  if (election.status !== 'closed') {
    return NextResponse.json(
      { error: 'Election must be closed before exporting certification bundle' },
      { status: 400 },
    )
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'json'

  const bundle = {
    election: {
      id: election.id,
      title: election.title,
      description: election.description,
      slug: election.slug,
      status: election.status,
      closedAt: election.endsAt,
    },
    contests: election.contests.map((contest) => {
      const method = contest.votingMethod as string
      const tally = getMethod(method).tally(
        contest.options,
        contest.ballots.map((b) => ({ rankings: b.rankings })),
        { seats: contest.seats, threshold: contest.threshold },
      )

      const shuffledBallots =
        contest.ballots.length >= contest.privacyThreshold
          ? seededShuffle(contest.ballots, contest.id)
          : []

      return {
        id: contest.id,
        title: contest.title,
        method,
        seats: contest.seats,
        threshold: contest.threshold,
        options: contest.options.map((o) => ({ id: o.id, label: o.label })),
        ballotCount: contest.ballots.length,
        ballots: shuffledBallots.map((b) => ({
          id: b.id,
          rankings: b.rankings,
        })),
        tally,
      }
    }),
    auditLog: election.auditLogs.map((log) => ({
      action: log.action,
      detail: log.detail,
      timestamp: log.createdAt,
    })),
  }

  if (format === 'csv') {
    // Simple CSV export: one row per ballot per contest
    const rows: string[] = []
    rows.push('contest_id,contest_title,ballot_id,rankings')

    for (const contest of bundle.contests) {
      for (const ballot of contest.ballots) {
        const rankingsJson = JSON.stringify(ballot.rankings).replace(/"/g, '""')
        rows.push(`${contest.id},"${contest.title}",${ballot.id},"${rankingsJson}"`)
      }
    }

    return new NextResponse(rows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${slug}-certification.csv"`,
      },
    })
  }

  return NextResponse.json(bundle)
}
