import { notFound } from 'next/navigation'
import { tallyApproval } from '@/lib/approval'
import { prisma } from '@/lib/prisma'
import { seededShuffle } from '@/lib/shuffle'
import { tallyStv } from '@/lib/stv'
import type { BallotInput } from '@/lib/tally'
import { tallyRcv } from '@/lib/tally'
import { tallyYesNo } from '@/lib/yesno'

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

          let winnerSection: React.ReactNode = null
          let tallyDetail: React.ReactNode = null

          if (method === 'approval') {
            const ballots: BallotInput[] = contest.ballots.map((b) => ({
              rankings: b.rankings as string[],
            }))
            const result = tallyApproval(contest.options, ballots, contest.seats)
            const winners = result.elected.map(
              (id) => contest.options.find((o) => o.id === id)?.label,
            )

            winnerSection = (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="text-sm text-green-700">
                  {winners.length} winner{winners.length !== 1 ? 's' : ''} (approval)
                </p>
                <p className="mt-1 text-xl font-semibold text-green-900">{winners.join(', ')}</p>
              </div>
            )

            tallyDetail = (
              <div className="mt-4">
                <h3 className="text-sm font-semibold">Approval counts</h3>
                <ul className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                  {result.votes.map((v) => (
                    <li
                      key={v.optionId}
                      className="flex items-center justify-between px-4 py-2 text-sm"
                    >
                      <span>{v.label}</span>
                      <span className="font-mono tabular-nums">{v.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          } else if (method === 'yesno') {
            const ballots = contest.ballots.map((b) => ({
              rankings: b.rankings as Record<string, string>,
            }))
            const result = tallyYesNo(contest.options, ballots, contest.threshold)

            winnerSection = (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="text-sm text-green-700">Threshold: {contest.threshold}% yes</p>
              </div>
            )

            tallyDetail = (
              <div className="mt-4">
                <h3 className="text-sm font-semibold">Results</h3>
                <ul className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                  {result.votes.map((v) => (
                    <li key={v.optionId} className="px-4 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{v.label}</span>
                        <span
                          className={v.passed ? 'text-green-600 font-semibold' : 'text-red-600'}
                        >
                          {v.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>
                      <div className="mt-1 flex gap-4 text-xs text-zinc-500">
                        <span>Yes: {v.yesCount}</span>
                        <span>No: {v.noCount}</span>
                        <span>
                          ({v.count > 0 ? ((v.yesCount / v.count) * 100).toFixed(1) : 0}% yes)
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          } else if (method === 'stv') {
            const ballots: BallotInput[] = contest.ballots.map((b) => ({
              rankings: b.rankings as string[],
            }))
            const rounds = tallyStv(contest.options, ballots, contest.seats)

            const allElected = rounds.flatMap((r) => r.elected)
            const electedLabels = allElected.map(
              (id) => contest.options.find((o) => o.id === id)?.label,
            )

            winnerSection = (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-center">
                <p className="text-sm text-green-700">
                  {electedLabels.length} winner{electedLabels.length !== 1 ? 's' : ''} (STV)
                </p>
                <p className="mt-1 text-xl font-semibold text-green-900">
                  {electedLabels.join(', ')}
                </p>
              </div>
            )

            tallyDetail = (
              <div className="mt-4">
                <h3 className="text-sm font-semibold">Round-by-round</h3>
                <div className="mt-2 space-y-4">
                  {rounds.map((r) => (
                    <div key={r.round} className="rounded-lg border border-zinc-200 p-3">
                      <h4 className="text-xs font-medium">
                        Round {r.round}
                        {r.elected.length > 0 && (
                          <span className="ml-2 text-green-600">
                            - Elected:{' '}
                            {r.elected
                              .map((id) => contest.options.find((o) => o.id === id)?.label)
                              .join(', ')}
                          </span>
                        )}
                      </h4>
                      <p className="mt-1 text-xs text-zinc-400">Quota: {r.quota}</p>
                      <ul className="mt-2 space-y-1">
                        {r.votes.map((v) => (
                          <li
                            key={v.optionId}
                            className="flex items-center justify-between text-sm"
                          >
                            <span>{v.label}</span>
                            <span className="font-mono tabular-nums">{v.count}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )
          } else {
            // RCV
            const ballots: BallotInput[] = contest.ballots.map((b) => ({
              rankings: b.rankings as string[],
            }))
            const rounds = tallyRcv(contest.options, ballots)

            const winner = rounds.find((r) => r.winner)
            const winnerOption = winner ? contest.options.find((o) => o.id === winner.winner) : null

            winnerSection = winnerOption ? (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-center">
                <p className="text-sm text-green-700">Winner</p>
                <p className="mt-1 text-xl font-semibold text-green-900">{winnerOption.label}</p>
              </div>
            ) : (
              rounds.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
                  <p className="text-sm text-amber-700">No winner</p>
                  <p className="mt-1 text-sm text-amber-800">
                    {ballotCount === 0
                      ? 'No votes have been cast yet.'
                      : 'The remaining candidates are tied.'}
                  </p>
                </div>
              )
            )

            tallyDetail =
              rounds.length > 0 ? (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold">Round-by-round</h3>
                  <div className="mt-2 space-y-4">
                    {rounds.map((r) => (
                      <div key={r.round} className="rounded-lg border border-zinc-200 p-3">
                        <h4 className="text-xs font-medium">
                          Round {r.round}
                          {r.winner && <span className="ml-2 text-green-600">- Winner</span>}
                        </h4>
                        <ul className="mt-2 space-y-1">
                          {r.votes.map((v) => (
                            <li
                              key={v.optionId}
                              className="flex items-center justify-between text-sm"
                            >
                              <span>{v.label}</span>
                              <span className="font-mono tabular-nums">{v.count}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
          }

          const methodLabel: Record<string, string> = {
            rcv: 'Ranked Choice',
            stv: 'STV',
            approval: 'Approval',
            yesno: 'Yes/No',
          }

          return (
            <div key={contest.id} className="rounded-xl border-2 border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-semibold">
                {i + 1}. {contest.title}
              </h2>
              <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
                <span>{methodLabel[method] || method}</span>
                {method === 'stv' && <span>{contest.seats} seats</span>}
                {method === 'yesno' && <span>{contest.threshold}% threshold</span>}
                <span>
                  {ballotCount} vote{ballotCount !== 1 ? 's' : ''} cast
                </span>
              </div>

              {winnerSection}
              {tallyDetail}

              {ballotCount > 0 && election.status === 'closed' && ballotCount >= 10 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold">All ballots (anonymized)</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    Ballots are shuffled to protect voter privacy.
                  </p>
                  <div className="mt-2 space-y-1">
                    {seededShuffle(contest.ballots, contest.id).map((b) => {
                      const rankings = b.rankings as string[]
                      return (
                        <div
                          key={b.id}
                          className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-600"
                        >
                          {method === 'approval'
                            ? rankings
                                .map((id) => contest.options.find((o) => o.id === id)?.label || id)
                                .join(', ')
                            : method === 'yesno'
                              ? JSON.stringify(b.rankings)
                              : rankings
                                  .map(
                                    (id) => contest.options.find((o) => o.id === id)?.label || id,
                                  )
                                  .join(' > ')}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {ballotCount > 0 && election.status === 'closed' && ballotCount < 10 && (
                <p className="mt-4 text-xs text-zinc-500">
                  Per-ballot details hidden for voter privacy (small electorate).
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
