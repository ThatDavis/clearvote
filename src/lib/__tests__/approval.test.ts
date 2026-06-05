import { describe, expect, it } from 'vitest'
import { tallyApproval } from '@/lib/approval'
import type { BallotInput, OptionInput } from '@/lib/tally'

const opts = (ids: string[]): OptionInput[] => ids.map((id) => ({ id, label: id.toUpperCase() }))

const ballots = (rankings: string[][]): BallotInput[] => rankings.map((r) => ({ rankings: r }))

describe('tallyApproval', () => {
  it('elects candidates with highest approval counts', () => {
    const options = opts(['a', 'b', 'c'])
    const ballotsInput = ballots([['a', 'b'], ['a', 'c'], ['a'], ['b'], ['c']])

    const result = tallyApproval(options, ballotsInput, 2)

    expect(result.elected).toHaveLength(2)
    expect(result.elected).toContain('a')
    expect(result.votes.find((v) => v.optionId === 'a')?.count).toBe(3)
  })

  it('breaks ties deterministically with lexicographically smallest optionId winning', () => {
    const options = opts(['a', 'b', 'c'])
    const ballotsInput = ballots([['a', 'b'], ['a', 'b'], ['c']])

    // Counts: a=2, b=2, c=1. With seats=1, tie between a and b.
    // Deterministic tie-break: a wins (lexicographically smallest).
    const result = tallyApproval(options, ballotsInput, 1)

    expect(result.elected).toHaveLength(1)
    expect(result.elected[0]).toBe('a')
  })

  it('is stable across input reordering', () => {
    const options = opts(['b', 'a', 'c']) // Reordered options
    const ballotsInput = ballots([['a', 'b'], ['a', 'b'], ['c']])

    const result = tallyApproval(options, ballotsInput, 1)

    expect(result.elected).toHaveLength(1)
    expect(result.elected[0]).toBe('a')
  })

  it('returns lexicographically first option when all counts are zero', () => {
    const options = opts(['b', 'a'])
    const result = tallyApproval(options, [], 1)

    // All counts are 0; tie-break goes to lexicographically smallest optionId.
    expect(result.elected).toEqual(['a'])
    expect(result.totalVotes).toBe(0)
  })
})
