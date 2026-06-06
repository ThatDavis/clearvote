import { tallyRcv } from '@/lib/tally'
import RankedContest from '@/components/ballot/ranked-contest'
import type { VotingMethodDef } from './types'

export const rcv: VotingMethodDef = {
  id: 'rcv',
  label: 'Ranked Choice',
  shortDesc: 'Rank candidates in order',
  fullDesc:
    'Voters rank candidates from first to last choice. If no one wins a majority, the last-place candidate is eliminated and their votes transfer to the next choice. Repeat until someone has a majority.',
  bestFor: 'Electing a single winner when you want broad consensus',
  ballotShape: 'ranking',
  minOptions: 2,
  uses: { seats: false, threshold: false },
  emptyBallot: () => [],
  tally: (options, ballots, _cfg) => ({
    kind: 'rcv',
    rounds: tallyRcv(
      options,
      (ballots as { rankings: string[] }[]),
    ),
  }),
  validateBallot: (raw, options) => {
    if (!Array.isArray(raw) || raw.length === 0) {
      return { ok: false, error: 'At least one ranking is required' }
    }
    const ids = new Set(options.map((o) => o.id))
    for (const id of raw) {
      if (!ids.has(id)) {
        return { ok: false, error: 'Invalid option in rankings' }
      }
    }
    return { ok: true, value: raw as string[] }
  },
  BallotComponent: RankedContest,
}
