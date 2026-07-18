import ApprovalContest from '@/components/ballot/approval-contest'
import { tallyApproval } from '@/lib/approval'
import type { VotingMethodDef } from './types'

export const approval: VotingMethodDef = {
  id: 'approval',
  label: 'Approval',
  shortDesc: 'Vote for any number you like',
  fullDesc:
    'Voters can select as many candidates as they approve of. The candidate with the most approvals wins. Simple, fast, and reduces strategic voting.',
  bestFor:
    'Quick decisions or when simplicity matters most, think "where do most people want to take a trip to"',
  ballotShape: 'ranking',
  minOptions: 2,
  uses: { seats: false, threshold: false },
  emptyBallot: () => [],
  tally: (options, ballots, _cfg) => ({
    kind: 'approval',
    result: tallyApproval(options, ballots as { rankings: string[] }[], 1),
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
  BallotComponent: ApprovalContest,
}
