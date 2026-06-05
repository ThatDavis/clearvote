import type { BallotInput, OptionInput, VoteCount } from './tally'
import { ballotSeed, seededOrder } from './tiebreak'

export interface ApprovalResult {
  votes: VoteCount[]
  elected: string[]
  totalVotes: number
}

export function tallyApproval(
  options: OptionInput[],
  ballots: BallotInput[],
  seats: number,
): ApprovalResult {
  const counts = new Map<string, number>()

  for (const ballot of ballots) {
    const approved = ballot.rankings
    for (const id of approved) {
      counts.set(id, (counts.get(id) || 0) + 1)
    }
  }

  // Approval ballots carry no preference order, so a count tie has no voter
  // signal to resolve it. Break ties impartially by lot, seeded from the ballot
  // data - reproducible, and blind to candidate id. A lower lot rank wins.
  const lotRank = new Map(
    seededOrder(
      options.map((o) => o.id),
      ballotSeed(ballots),
    ).map((id, i) => [id, i]),
  )

  const voteList: VoteCount[] = options
    .map((o) => ({
      optionId: o.id,
      label: o.label,
      count: counts.get(o.id) || 0,
    }))
    // Higher count first; ties broken by the seeded lot rank.
    .sort(
      (a, b) =>
        b.count - a.count ||
        (lotRank.get(a.optionId) as number) - (lotRank.get(b.optionId) as number),
    )

  const elected = voteList.slice(0, seats).map((v) => v.optionId)

  return { votes: voteList, elected, totalVotes: ballots.length }
}
