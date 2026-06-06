import { tallyStv } from '@/lib/stv'
import RankedContest from '@/components/ballot/ranked-contest'
import type { VotingMethodDef } from './types'

export const stv: VotingMethodDef = {
  id: 'stv',
  label: 'Multi-winner',
  shortDesc: 'Rank candidates, multiple winners',
  fullDesc:
    'Like ranked choice, but elects multiple winners. Surplus votes from winners and eliminated candidates transfer proportionally. Ensures diverse representation.',
  bestFor: 'Electing boards, committees, or councils',
  ballotShape: 'ranking',
  minOptions: 2,
  uses: { seats: true, threshold: false },
  emptyBallot: () => [],
  tally: (options, ballots, cfg) => ({
    kind: 'stv',
    rounds: tallyStv(
      options,
      (ballots as { rankings: string[] }[]),
      cfg.seats,
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
