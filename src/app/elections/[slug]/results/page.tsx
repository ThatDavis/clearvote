import { notFound } from 'next/navigation'
import ResultsView from '@/components/results-view'
import { electionAuditLog } from '@/lib/election-audit'
import { prisma } from '@/lib/prisma'
import { getMethod } from '@/lib/voting-methods'

export default async function ElectionResultsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const election = await prisma.election.findUnique({
    where: { slug },
    include: {
      contests: {
        orderBy: { contestOrder: 'asc' },
        include: {
          options: {
            orderBy: { order: 'asc' },
          },
          ballots: {
            select: { id: true, rankings: true },
          },
        },
      },
      _count: {
        select: { receipts: true, rolls: true, tokens: true },
      },
    },
  })

  if (!election) {
    notFound()
  }

  // Log first results view
  const alreadyViewed = await prisma.electionAuditLog.findFirst({
    where: { electionId: election.id, action: 'results_viewed' },
  })
  if (!alreadyViewed) {
    await electionAuditLog({
      electionId: election.id,
      action: 'results_viewed',
    })
  }

  const statusLabel = { draft: 'Draft', open: 'Open', closed: 'Closed' }[election.status]
  const turnout = election._count.receipts
  const eligible = election._count.rolls + election._count.tokens

  return (
    <div className="w-full px-[10%] py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{election.title}</h1>
      {election.description && <p className="mt-2 text-zinc-600">{election.description}</p>}

      <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500">
        <span>{statusLabel}</span>
        <span>
          {turnout} ballot{turnout !== 1 ? 's' : ''} cast
        </span>
        <span>
          {eligible} eligible voter{eligible !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="mt-10 space-y-12">
        {election.contests.map((contest, i) => {
          const method = contest.votingMethod as string
          const ballotCount = contest.ballots.length
          const methodDef = getMethod(method)

          return (
            <div key={contest.id} className="rounded-xl border-2 border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-semibold">
                {i + 1}. {contest.title}
              </h2>
              <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
                <span>{methodDef.label}</span>
                {methodDef.uses.seats && <span>{contest.seats} seats</span>}
                {methodDef.uses.threshold && <span>{contest.threshold}% threshold</span>}
                <span>
                  {ballotCount} vote{ballotCount !== 1 ? 's' : ''} cast
                </span>
              </div>

              <ResultsView
                method={method}
                options={contest.options}
                ballots={contest.ballots}
                cfg={{ seats: contest.seats, threshold: contest.threshold }}
                showBallots={election.status === 'closed'}
                privacyThreshold={10}
                shuffleSeed={contest.id}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
