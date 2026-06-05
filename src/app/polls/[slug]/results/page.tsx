import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { BallotInput } from '@/lib/tally'
import { tallyRcv } from '@/lib/tally'

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

  const ballots: BallotInput[] = poll.ballots.map((b) => ({
    rankings: b.rankings as string[],
  }))

  const rounds = tallyRcv(poll.options, ballots)

  const statusLabel = {
    draft: 'Draft',
    open: 'Open',
    closed: 'Closed',
  }[poll.status]

  const winner = rounds.find((r) => r.winner)
  const winnerOption = winner ? poll.options.find((o) => o.id === winner.winner) : null

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{poll.title}</h1>
      {poll.description && <p className="mt-2 text-zinc-600">{poll.description}</p>}

      <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500">
        <span>{statusLabel}</span>
        <span>
          {poll.ballots.length} vote{poll.ballots.length !== 1 ? 's' : ''} cast
        </span>
      </div>

      {winnerOption ? (
        <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-sm text-green-700">Winner</p>
          <p className="mt-1 text-2xl font-semibold text-green-900">{winnerOption.label}</p>
        </div>
      ) : (
        rounds.length > 0 && (
          <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="text-sm text-amber-700">No winner</p>
            <p className="mt-1 text-sm text-amber-800">
              {poll.ballots.length === 0
                ? 'No votes have been cast yet.'
                : 'The remaining candidates are tied.'}
            </p>
          </div>
        )
      )}

      {rounds.length > 0 && (
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
      )}

      {poll.ballots.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold">All ballots (anonymized)</h2>
          <div className="mt-4 space-y-2">
            {poll.ballots.map((b) => {
              const rankings = b.rankings as string[]
              return (
                <div
                  key={b.id}
                  className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-600"
                >
                  {rankings
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
