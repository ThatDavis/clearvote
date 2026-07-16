import BarChart from '@/components/charts/bar-chart'
import { seededShuffle } from '@/lib/shuffle'
import type { OptionInput } from '@/lib/tally'
import { getMethod } from '@/lib/voting-methods'

interface Ballot {
  id: string
  rankings: unknown
}

interface Props {
  method: string
  options: OptionInput[]
  ballots: Ballot[]
  cfg: { seats: number; threshold: number }
  /** Shown when closed and ballotCount > 0 */
  showBallots?: boolean
  /** Hide per-ballot dump below this count */
  privacyThreshold?: number
  /** Seed for shuffle */
  shuffleSeed?: string
}

export default function ResultsView({
  method,
  options,
  ballots,
  cfg,
  showBallots = false,
  privacyThreshold = 10,
  shuffleSeed,
}: Props) {
  const result = getMethod(method).tally(
    options,
    ballots.map((b) => ({ rankings: b.rankings })),
    cfg,
  )

  let winnerSection: React.ReactNode = null
  let tallyDetail: React.ReactNode = null

  if (result.kind === 'approval') {
    const { result: approvalResult } = result
    const winners = approvalResult.elected.map((id) => options.find((o) => o.id === id)?.label)

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
        <BarChart
          className="mt-2"
          ariaLabel="Approval counts per option"
          bars={approvalResult.votes.map((v) => ({
            label: v.label,
            segments: [
              {
                value: v.count,
                label: 'Approvals',
                className: approvalResult.elected.includes(v.optionId)
                  ? 'bg-green-500'
                  : 'bg-chicago-navy',
              },
            ],
            caption: v.count,
          }))}
        />
      </div>
    )
  } else if (result.kind === 'yesno') {
    const { result: yesNoResult } = result

    winnerSection = (
      <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
        <p className="text-sm text-green-700">Threshold: {cfg.threshold}% yes</p>
      </div>
    )

    tallyDetail = (
      <div className="mt-4">
        <h3 className="text-sm font-semibold">Results</h3>
        <BarChart
          className="mt-2"
          mode="relative"
          ariaLabel="Yes and no votes per option"
          thresholdPct={cfg.threshold}
          thresholdLabel={`Threshold: ${cfg.threshold}% yes`}
          bars={yesNoResult.votes.map((v) => ({
            label: v.label,
            segments: [
              { value: v.yesCount, label: 'Yes', className: 'bg-green-500' },
              { value: v.noCount, label: 'No', className: 'bg-red-500' },
            ],
          }))}
        />
        <ul className="mt-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200">
          {yesNoResult.votes.map((v) => (
            <li key={v.optionId} className="px-4 py-2 text-sm">
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
  } else if (result.kind === 'stv') {
    const { rounds } = result
    const allElected = rounds.flatMap((r) => r.elected)
    const electedLabels = allElected.map((id) => options.find((o) => o.id === id)?.label)

    winnerSection = (
      <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-center">
        <p className="text-sm text-green-700">
          {electedLabels.length} winner{electedLabels.length !== 1 ? 's' : ''} (STV)
        </p>
        <p className="mt-1 text-xl font-semibold text-green-900">{electedLabels.join(', ')}</p>
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
                    {r.elected.map((id) => options.find((o) => o.id === id)?.label).join(', ')}
                  </span>
                )}
              </h4>
              <p className="mt-1 text-xs text-zinc-400">Quota: {r.quota}</p>
              <BarChart
                ariaLabel={`Round ${r.round} vote counts`}
                bars={r.votes.map((v) => ({
                  label: v.label,
                  segments: [
                    {
                      value: v.count,
                      label: 'Votes',
                      className: r.elected.includes(v.optionId)
                        ? 'bg-green-500'
                        : 'bg-chicago-navy',
                    },
                  ],
                  caption: v.count,
                }))}
              />
            </div>
          ))}
        </div>
      </div>
    )
  } else {
    // rcv
    const { rounds } = result
    const winner = rounds.find((r) => r.winner)
    const winnerOption = winner ? options.find((o) => o.id === winner.winner) : null
    const ballotCount = ballots.length

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
                <BarChart
                  ariaLabel={`Round ${r.round} vote counts`}
                  bars={r.votes.map((v) => ({
                    label: v.label,
                    segments: [
                      {
                        value: v.count,
                        label: 'Votes',
                        className: r.winner === v.optionId ? 'bg-green-500' : 'bg-chicago-navy',
                      },
                    ],
                    caption: v.count,
                  }))}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null
  }

  const ballotCount = ballots.length
  const showDump = showBallots && ballotCount > 0 && ballotCount >= privacyThreshold
  const shuffled = shuffleSeed ? seededShuffle(ballots, shuffleSeed) : ballots

  return (
    <>
      {winnerSection}
      {tallyDetail}
      {showDump && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold">All ballots (anonymized)</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Ballots are shuffled to protect voter privacy.
          </p>
          <div className="mt-2 space-y-1">
            {shuffled.map((b) => {
              const rankings = b.rankings as string[]
              return (
                <div
                  key={b.id}
                  className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-600"
                >
                  {result.kind === 'approval'
                    ? rankings.map((id) => options.find((o) => o.id === id)?.label || id).join(', ')
                    : result.kind === 'yesno'
                      ? JSON.stringify(b.rankings)
                      : rankings
                          .map((id) => options.find((o) => o.id === id)?.label || id)
                          .join(' > ')}
                </div>
              )
            })}
          </div>
        </div>
      )}
      {showBallots && ballotCount > 0 && ballotCount < privacyThreshold && (
        <p className="mt-4 text-xs text-zinc-500">
          Per-ballot details hidden for voter privacy (small electorate).
        </p>
      )}
    </>
  )
}
