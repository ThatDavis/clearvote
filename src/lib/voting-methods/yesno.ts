import YesNoContest from '@/components/ballot/yesno-contest'
import { tallyYesNo } from '@/lib/yesno'
import type { VotingMethodDef } from './types'

export const yesno: VotingMethodDef = {
  id: 'yesno',
  label: 'Yes / No',
  shortDesc: 'Approve or reject each option',
  fullDesc:
    'Each option is voted on individually as yes or no. Options that meet the pass threshold are approved. Great for referendums or multiple proposals.',
  bestFor: 'Referendums, bylaw changes, or multiple proposals',
  ballotShape: 'map',
  minOptions: 1,
  uses: { seats: false, threshold: true },
  emptyBallot: () => ({}),
  tally: (options, ballots, cfg) => ({
    kind: 'yesno',
    result: tallyYesNo(options, ballots as { rankings: Record<string, string> }[], cfg.threshold),
  }),
  validateBallot: (raw, options) => {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
      return { ok: false, error: 'Expected a yes/no map' }
    const ids = new Set(options.map((o) => o.id))
    const validVotes = new Set(['yes', 'no', 'abstain'])
    for (const [id, vote] of Object.entries(raw as Record<string, string>)) {
      if (!ids.has(id)) return { ok: false, error: `Unknown option ${id}` }
      if (!validVotes.has(vote)) return { ok: false, error: `Bad vote ${vote}` }
    }
    return { ok: true, value: raw as Record<string, string> }
  },
  BallotComponent: YesNoContest,
}
