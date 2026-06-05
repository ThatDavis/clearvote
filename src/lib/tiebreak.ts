import { seededShuffle } from './shuffle'

// A ballot as seen by the tie-breaker: ranked preferences, plus an optional
// weight (STV ballots carry fractional weight after surplus transfers).
export interface WeightedBallot {
  rankings: string[]
  weight?: number
}

// Support sums can be fractional in STV (products of transfer values). Round
// before comparing so floating-point noise never invents or hides a tie.
function roundSupport(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

// Build a reproducible seed from the ballots themselves. When voters give no
// signal to separate a tie, the tie is broken "by lot" using this seed - so the
// result is impartial yet still reproducible from the raw ballot data, and never
// depends on database identifiers.
export function ballotSeed(ballots: { rankings: string[] }[]): string {
  return ballots.map((b) => b.rankings.join('>')).join('|')
}

// Order candidate ids by lot: a reproducible, id-blind permutation seeded from
// the ballot data. The input is sorted first so the result depends only on the
// set of ids and the seed, never on the order the ids were passed in. The sort
// only canonicalizes the draw's starting order; which id is chosen is decided by
// the ballot-derived seed, not by the ids themselves.
export function seededOrder(ids: string[], seed: string): string[] {
  return seededShuffle([...ids].sort(), seed)
}

// Decide which of the tied candidates to ELIMINATE using the Next-Preference
// Cascade. Restrict each ballot to the still-tied candidates, see which tied
// candidate each voter prefers (their highest-ranked among the set), and narrow
// to the least-preferred. Repeat: among that narrowed set, ask again who voters
// prefer least. Stop when one candidate remains, or when voters give no further
// signal (every remaining candidate has identical support), in which case break
// the remaining tie impartially by lot.
//
// This reflects voter preference and is blind to candidate/database identifiers.
export function breakEliminationTie(
  tied: string[],
  ballots: WeightedBallot[],
  seed: string,
): string {
  if (tied.length === 1) return tied[0]

  let current = [...tied]

  while (current.length > 1) {
    const inCurrent = new Set(current)
    const support = new Map<string, number>(current.map((id) => [id, 0]))

    for (const ballot of ballots) {
      // The voter's most-preferred candidate among those still tied.
      const top = ballot.rankings.find((id) => inCurrent.has(id))
      if (top !== undefined) {
        support.set(top, (support.get(top) as number) + (ballot.weight ?? 1))
      }
    }

    const supportOf = (id: string) => roundSupport(support.get(id) as number)
    const minSupport = Math.min(...current.map(supportOf))
    const leastPreferred = current.filter((id) => supportOf(id) === minSupport)

    // No separation: every still-tied candidate is preferred equally often. The
    // voters give no further signal, so stop cascading and break by lot.
    if (leastPreferred.length === current.length) break

    current = leastPreferred
  }

  if (current.length === 1) return current[0]

  return seededOrder(current, seed)[0]
}
