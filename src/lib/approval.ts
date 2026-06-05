import type { BallotInput, OptionInput, VoteCount } from './tally'

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

  const voteList: VoteCount[] = options
    .map((o) => ({
      optionId: o.id,
      label: o.label,
      count: counts.get(o.id) || 0,
    }))
    .sort((a, b) => b.count - a.count)

  const elected = voteList.slice(0, seats).map((v) => v.optionId)

  return { votes: voteList, elected, totalVotes: ballots.length }
}
