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

  it('breaks a count tie by reproducible lot, not by candidate id', () => {
    const options = opts(['a', 'b', 'c'])
    const ballotsInput = ballots([['a', 'b'], ['a', 'b'], ['c']])

    // Counts: a=2, b=2, c=1. With seats=1, A and B tie. Approval ballots carry no
    // preference order, so the tie is broken by a seeded lot - reproducible, and
    // not decided by candidate id.
    const result = tallyApproval(options, ballotsInput, 1)

    expect(result.elected).toHaveLength(1)
    expect(['a', 'b']).toContain(result.elected[0])
    expect(tallyApproval(options, ballotsInput, 1).elected).toEqual(result.elected)
  })

  it('is stable across input reordering', () => {
    const ballotsInput = ballots([['a', 'b'], ['a', 'b'], ['c']])

    const ordered = tallyApproval(opts(['a', 'b', 'c']), ballotsInput, 1)
    const reordered = tallyApproval(opts(['b', 'a', 'c']), ballotsInput, 1)

    // The lot is seeded from ballot data and canonicalizes candidate order, so the
    // outcome does not depend on the order options are supplied in.
    expect(reordered.elected).toEqual(ordered.elected)
  })

  it('breaks an all-zero tie by reproducible lot', () => {
    const options = opts(['b', 'a'])
    const result = tallyApproval(options, [], 1)

    // All counts are 0 and there are no ballots; the seat is filled by the seeded
    // lot. The result is deterministic and reproducible.
    expect(result.elected).toHaveLength(1)
    expect(['a', 'b']).toContain(result.elected[0])
    expect(tallyApproval(options, [], 1).elected).toEqual(result.elected)
    expect(result.totalVotes).toBe(0)
  })
})
