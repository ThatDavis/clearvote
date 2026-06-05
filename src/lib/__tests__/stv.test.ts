import { describe, expect, it } from 'vitest'
import { tallyStv } from '@/lib/stv'
import type { BallotInput, OptionInput } from '@/lib/tally'

const opts = (ids: string[]): OptionInput[] => ids.map((id) => ({ id, label: id.toUpperCase() }))

const ballots = (rankings: string[][]): BallotInput[] => rankings.map((r) => ({ rankings: r }))

describe('tallyStv', () => {
  it('elects a single winner (should match RCV behavior)', () => {
    const options = opts(['a', 'b', 'c'])
    const votes = ballots([
      ['a', 'b', 'c'],
      ['a', 'c', 'b'],
      ['a', 'b', 'c'],
      ['b', 'a', 'c'],
      ['c', 'a', 'b'],
    ])

    const result = tallyStv(options, votes, 1)

    expect(result.length).toBeGreaterThanOrEqual(1)
    const lastRound = result[result.length - 1]
    expect(lastRound.elected).toContain('a')
  })

  it('elects two winners from four candidates', () => {
    const options = opts(['a', 'b', 'c', 'd'])
    const votes = ballots([
      ['a', 'b', 'c', 'd'],
      ['a', 'b', 'd', 'c'],
      ['a', 'c', 'b', 'd'],
      ['a', 'c', 'd', 'b'],
      ['a', 'd', 'b', 'c'],
      ['b', 'a', 'c', 'd'],
      ['b', 'a', 'd', 'c'],
      ['b', 'c', 'a', 'd'],
      ['b', 'd', 'a', 'c'],
      ['c', 'a', 'b', 'd'],
      ['c', 'b', 'a', 'd'],
      ['d', 'a', 'b', 'c'],
    ])

    const result = tallyStv(options, votes, 2)

    const elected = new Set<string>()
    for (const r of result) {
      for (const e of r.elected) {
        elected.add(e)
      }
    }

    expect(elected.size).toBe(2)
  })

  it('handles quota calculation correctly', () => {
    const options = opts(['a', 'b', 'c'])
    const votes = ballots([['a'], ['a'], ['a'], ['a'], ['a'], ['b'], ['b'], ['c'], ['c']])

    const result = tallyStv(options, votes, 1)
    const quota = Math.floor(9 / (1 + 1)) + 1 // = 5

    expect(result[0].quota).toBe(quota)
    // A has 5, meets quota exactly
    expect(result.some((r) => r.elected.includes('a'))).toBe(true)
  })

  it('handles all seats filled in first round', () => {
    const options = opts(['a', 'b', 'c'])
    const votes = ballots([['a'], ['a'], ['a'], ['b'], ['b'], ['b'], ['c']])

    const result = tallyStv(options, votes, 2)
    const quota = Math.floor(7 / (2 + 1)) + 1 // = 3

    // A has 3 (meets quota), B has 3 (meets quota)
    expect(result[0].quota).toBe(quota)
    expect(result[0].elected).toContain('a')
    expect(result[0].elected).toContain('b')
  })

  it('breaks elimination ties by weighted voter preference, reproducibly', () => {
    const options = opts(['a', 'b', 'c'])
    // A and B tie on first preferences; among the {A, B} pair voters prefer A, so
    // B is the one eliminated. The full result must be reproducible run to run.
    const votes = ballots([['a'], ['a'], ['b'], ['b'], ['c', 'a'], ['c', 'a'], ['c'], ['c']])

    const result = tallyStv(options, votes, 1)

    expect(result[0].eliminated).toEqual(['b'])
    expect(tallyStv(options, votes, 1)).toEqual(result)
  })
})
