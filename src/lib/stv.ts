import type { BallotInput, OptionInput, Round, VoteCount } from './tally'

export interface StvRound extends Round {
  quota: number
  elected: string[]
}

export function tallyStv(
  options: OptionInput[],
  ballots: BallotInput[],
  seats: number,
): StvRound[] {
  if (seats <= 0 || seats >= options.length) {
    seats = options.length
  }

  const rounds: StvRound[] = []
  const eliminated = new Set<string>()
  const elected = new Set<string>()
  const optionMap = new Map(options.map((o) => [o.id, o.label]))

  // Each ballot has a weight (starts at 1.0, decreases with surplus transfers)
  const ballotWeights = ballots.map(() => 1)

  const totalVotes = ballots.length
  const quota = Math.floor(totalVotes / (seats + 1)) + 1

  let round = 1

  while (elected.size < seats && eliminated.size + elected.size < options.length) {
    const counts = new Map<string, number>()

    for (let i = 0; i < ballots.length; i++) {
      const top = ballots[i].rankings.find((id) => !eliminated.has(id) && !elected.has(id))
      if (top) {
        counts.set(top, (counts.get(top) || 0) + ballotWeights[i])
      }
    }

    const totalActive = ballotWeights.reduce((sum, w, i) => {
      const hasActive = ballots[i].rankings.some((id) => !eliminated.has(id) && !elected.has(id))
      return sum + (hasActive ? ballotWeights[i] : 0)
    }, 0)

    const exhausted = totalVotes - totalActive

    const remaining = options.filter((o) => !eliminated.has(o.id) && !elected.has(o.id))
    const voteList: VoteCount[] = remaining
      .map((o) => ({
        optionId: o.id,
        label: o.label,
        count: Math.round((counts.get(o.id) || 0) * 10000) / 10000,
      }))
      .sort((a, b) => b.count - a.count)

    const roundElected: string[] = []

    for (const vc of voteList) {
      if (elected.size >= seats) break
      if (vc.count >= quota) {
        roundElected.push(vc.optionId)
        elected.add(vc.optionId)

        const surplus = vc.count - quota
        if (surplus > 0) {
          const transferValue = surplus / vc.count
          for (let i = 0; i < ballots.length; i++) {
            const top = ballots[i].rankings.find((id) => !eliminated.has(id) && !elected.has(id))
            if (top === vc.optionId) {
              ballotWeights[i] *= transferValue
            }
          }
        }
      }
    }

    rounds.push({
      round,
      quota,
      votes: voteList,
      elected: roundElected,
      eliminated: [],
      exhausted: Math.round(exhausted * 10000) / 10000,
    })

    // If all seats filled, break
    if (elected.size >= seats) break

    // Find candidates to eliminate (lowest vote among non-elected)
    const nonElected = voteList.filter((v) => !elected.has(v.optionId))
    if (nonElected.length === 0) break

    const minVotes = nonElected[nonElected.length - 1].count
    const toEliminate = nonElected.filter((v) => v.count === minVotes).map((v) => v.optionId)

    // Don't eliminate if it would remove all remaining candidates
    if (toEliminate.length === remaining.length - roundElected.length) {
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
