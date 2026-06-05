import { ballotSeed, breakEliminationTie } from './tiebreak'

export interface OptionInput {
  id: string
  label: string
}

export type Ranking = string[]

export interface BallotInput {
  rankings: Ranking
}

export interface VoteCount {
  optionId: string
  label: string
  count: number
}

export interface Round {
  round: number
  votes: VoteCount[]
  eliminated: string[]
  exhausted: number
  winner?: string
}

function majorityThreshold(totalActive: number): number {
  return Math.floor(totalActive / 2) + 1
}

export function tallyRcv(options: OptionInput[], ballots: BallotInput[]): Round[] {
  const rounds: Round[] = []
  const eliminated = new Set<string>()
  const seed = ballotSeed(ballots)

  let round = 1
  let winner: string | undefined

  while (eliminated.size < options.length && !winner) {
    // Count: for each ballot, find the highest-ranked non-eliminated option
    const counts = new Map<string, number>()
    let exhausted = 0

    for (const ballot of ballots) {
      const top = ballot.rankings.find((id) => !eliminated.has(id))
      if (top) {
        counts.set(top, (counts.get(top) || 0) + 1)
      } else {
        exhausted++
      }
    }

    const totalActive = ballots.length - exhausted
    const remaining = options.filter((o) => !eliminated.has(o.id))

    const voteList: VoteCount[] = remaining
      .map((o) => ({
        optionId: o.id,
        label: o.label,
        count: counts.get(o.id) || 0,
      }))
      .sort((a, b) => b.count - a.count)

    // Check for majority winner
    if (totalActive > 0) {
      const leader = voteList[0]
      if (leader.count >= majorityThreshold(totalActive)) {
        winner = leader.optionId
      }
    }

    // If only one candidate remains and no winner yet, they win
    if (!winner && remaining.length === 1) {
      winner = remaining[0].id
    }

    rounds.push({
      round,
      votes: voteList,
      eliminated: [],
      exhausted,
      ...(winner ? { winner } : {}),
    })

    if (winner) break

    // Find candidates to eliminate. Ties are broken by the Next-Preference
    // Cascade (voter preference among the tied candidates), not by candidate id.
    const minVotes = voteList[voteList.length - 1].count
    const tied = voteList.filter((v) => v.count === minVotes).map((v) => v.optionId)
    const toEliminate = [breakEliminationTie(tied, ballots, seed)]

    // Don't eliminate if it would remove all remaining candidates
    if (toEliminate.length === remaining.length) {
      break
    }

    for (const id of toEliminate) {
      eliminated.add(id)
    }

    rounds[rounds.length - 1].eliminated = toEliminate

    round++
  }

  return rounds
}
