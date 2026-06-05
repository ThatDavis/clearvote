import { notFound } from 'next/navigation'
import { tallyApproval } from '@/lib/approval'
import { auditLog } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { seededShuffle } from '@/lib/shuffle'
import { tallyStv } from '@/lib/stv'
import type { BallotInput } from '@/lib/tally'
import { tallyRcv } from '@/lib/tally'
import { tallyYesNo } from '@/lib/yesno'

export default async function ResultsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const poll = await prisma.poll.findUnique({
    where: { slug },
    include: {
      options: {
        orderBy: { order: 'asc' },
      },
      ballots: {
        select: { id: true, rankings: true },
      },
    },
  })

  if (!poll) {
    notFound()
  }

  // Log first results view
  const alreadyViewed = await prisma.auditLog.findFirst({
    where: { pollId: poll.id, action: 'results_viewed' },
  })
  if (!alreadyViewed) {
    await auditLog({
      pollId: poll.id,
      action: 'results_viewed',
    })
  }

  const method = poll.votingMethod as string
  const statusLabel = { draft: 'Draft', open: 'Open', closed: 'Closed' }[poll.status]
  const ballotCount = poll.ballots.length

  let winnerSection: React.ReactNode = null
  let tallyDetail: React.ReactNode = null

  if (method === 'approval') {
    const ballots: BallotInput[] = poll.ballots.map((b) => ({
      rankings: b.rankings as string[],
    }))
    const result = tallyApproval(poll.options, ballots, poll.seats)
    const winners = result.elected.map((id) => poll.options.find((o) => o.id === id)?.label)

    winnerSection = (
      <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-6">
        <p className="text-sm text-green-700">
          {winners.length} winner{winners.length !== 1 ? 's' : ''} (approval)
        </p>
        <p className="mt-1 text-2xl font-semibold text-green-900">{winners.join(', ')}</p>
      </div>
    )

    tallyDetail = (
      <div className="mt-10">
        <h2 className="text-lg font-semibold">Approval counts</h2>
        <ul className="mt-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200">
          {result.votes.map((v) => (
            <li key={v.optionId} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{v.label}</span>
              <span className="font-mono tabular-nums">{v.count}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  } else if (method === 'yesno') {
    const ballots = poll.ballots.map((b) => ({
      rankings: b.rankings as Record<string, string>,
    }))
    const result = tallyYesNo(poll.options, ballots, poll.threshold)

    winnerSection = (
      <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-6">
        <p className="text-sm text-green-700">Threshold: {poll.threshold}% yes</p>
      </div>
    )

    tallyDetail = (
      <div className="mt-10">
        <h2 className="text-lg font-semibold">Results</h2>
        <ul className="mt-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200">
          {result.votes.map((v) => (
            <li key={v.optionId} className="px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{v.label}</span>
                <span className={v.passed ? 'text-green-600 font-semibold' : 'text-red-600'}>
                  {v.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
              <div className="mt-1 flex gap-4 text-xs text-zinc-500">
                <span>Yes: {v.yesCount}</span>
                <span>No: {v.noCount}</span>
                <span>({v.count > 0 ? ((v.yesCount / v.count) * 100).toFixed(1) : 0}% yes)</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    )
  } else if (method === 'stv') {
    const ballots: BallotInput[] = poll.ballots.map((b) => ({
      rankings: b.rankings as string[],
    }))
    const rounds = tallyStv(poll.options, ballots, poll.seats)

    const allElected = rounds.flatMap((r) => r.elected)
    const electedLabels = allElected.map((id) => poll.options.find((o) => o.id === id)?.label)

    winnerSection = (
      <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-sm text-green-700">
          {electedLabels.length} winner{electedLabels.length !== 1 ? 's' : ''} (STV)
        </p>
        <p className="mt-1 text-2xl font-semibold text-green-900">{electedLabels.join(', ')}</p>
      </div>
    )

    tallyDetail = (
      <div className="mt-10">
        <h2 className="text-lg font-semibold">Round-by-round</h2>
        <div className="mt-4 space-y-6">
          {rounds.map((r) => (
            <div key={r.round} className="rounded-lg border border-zinc-200 p-4">
              <h3 className="text-sm font-medium">
                Round {r.round}
                {r.elected.length > 0 && (
                  <span className="ml-2 text-green-600">
                    — Elected:{' '}
                    {r.elected.map((id) => poll.options.find((o) => o.id === id)?.label).join(', ')}
                  </span>
                )}
              </h3>
              <p className="mt-1 text-xs text-zinc-400">Quota: {r.quota}</p>
              <ul className="mt-3 space-y-1">
                {r.votes.map((v) => (
                  <li key={v.optionId} className="flex items-center justify-between text-sm">
                    <span>{v.label}</span>
                    <span className="font-mono tabular-nums">{v.count}</span>
                  </li>
                ))}
              </ul>
              {r.exhausted > 0 && (
                <p className="mt-2 text-xs text-zinc-400">{r.exhausted} exhausted weight</p>
              )}
              {r.eliminated.length > 0 && (
                <p className="mt-1 text-xs text-red-500">
                  Eliminated:{' '}
                  {r.eliminated
                    .map((id) => poll.options.find((o) => o.id === id)?.label)
                    .join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  } else {
    // Default RCV
    const ballots: BallotInput[] = poll.ballots.map((b) => ({
      rankings: b.rankings as string[],
    }))
    const rounds = tallyRcv(poll.options, ballots)

    const winner = rounds.find((r) => r.winner)
    const winnerOption = winner ? poll.options.find((o) => o.id === winner.winner) : null

    winnerSection = winnerOption ? (
      <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-sm text-green-700">Winner</p>
        <p className="mt-1 text-2xl font-semibold text-green-900">{winnerOption.label}</p>
      </div>
    ) : (
      rounds.length > 0 && (
        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
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
        <div className="mt-10">
          <h2 className="text-lg font-semibold">Round-by-round</h2>
          <div className="mt-4 space-y-6">
            {rounds.map((r) => (
              <div key={r.round} className="rounded-lg border border-zinc-200 p-4">
                <h3 className="text-sm font-medium">
                  Round {r.round}
                  {r.winner && <span className="ml-2 text-green-600">— Winner</span>}
                </h3>
                <ul className="mt-3 space-y-1">
                  {r.votes.map((v) => (
                    <li key={v.optionId} className="flex items-center justify-between text-sm">
                      <span>{v.label}</span>
                      <span className="font-mono tabular-nums">{v.count}</span>
                    </li>
                  ))}
                </ul>
                {r.exhausted > 0 && (
                  <p className="mt-2 text-xs text-zinc-400">
                    {r.exhausted} exhausted ballot{r.exhausted !== 1 ? 's' : ''}
                  </p>
                )}
                {r.eliminated.length > 0 && (
                  <p className="mt-1 text-xs text-red-500">
                    Eliminated:{' '}
                    {r.eliminated
                      .map((id) => poll.options.find((o) => o.id === id)?.label)
                      .join(', ')}
                  </p>
                )}
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
    <div className="w-full px-[10%] py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{poll.title}</h1>
      {poll.description && <p className="mt-2 text-zinc-600">{poll.description}</p>}

      <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500">
        <span>{statusLabel}</span>
        <span>{methodLabel[method] || method}</span>
        {method === 'yesno' && <span>{poll.threshold}% threshold</span>}
        {method === 'stv' && <span>{poll.seats} seats</span>}
        <span>
          {ballotCount} vote{ballotCount !== 1 ? 's' : ''} cast
        </span>
      </div>

      {winnerSection}
      {tallyDetail}

      {ballotCount > 0 && poll.status === 'closed' && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold">All ballots (anonymized)</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Ballots are shuffled to protect voter privacy.
          </p>
          <div className="mt-4 space-y-2">
            {seededShuffle(poll.ballots, poll.id).map((b) => {
              const rankings = b.rankings as string[]
              return (
                <div
                  key={b.id}
                  className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-600"
                >
                  {method === 'approval'
                    ? rankings
                        .map((id) => poll.options.find((o) => o.id === id)?.label || id)
                        .join(', ')
                    : method === 'yesno'
                      ? JSON.stringify(b.rankings)
                      : rankings
                          .map((id) => poll.options.find((o) => o.id === id)?.label || id)
                          .join(' > ')}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
