import type { OptionInput, VoteCount } from './tally'

export interface YesNoBallot {
  rankings: Record<string, string>
}

export interface YesNoResult {
  votes: (VoteCount & { yesCount: number; noCount: number; passed: boolean })[]
  totalVotes: number
}

export function tallyYesNo(
  options: OptionInput[],
  ballots: YesNoBallot[],
  threshold: number,
): YesNoResult {
  const yesCounts = new Map<string, number>()
  const noCounts = new Map<string, number>()

  for (const ballot of ballots) {
    for (const [optionId, vote] of Object.entries(ballot.rankings)) {
      if (vote === 'yes') {
        yesCounts.set(optionId, (yesCounts.get(optionId) || 0) + 1)
      } else if (vote === 'no') {
        noCounts.set(optionId, (noCounts.get(optionId) || 0) + 1)
      }
    }
  }

  const votes = options.map((o) => {
    const yes = yesCounts.get(o.id) || 0
    const no = noCounts.get(o.id) || 0
    const total = yes + no
    const pct = total > 0 ? (yes / total) * 100 : 0
    return {
      optionId: o.id,
      label: o.label,
      count: total,
      yesCount: yes,
      noCount: no,
      passed: total > 0 && pct >= threshold,
    }
  })

  return { votes, totalVotes: ballots.length }
}
