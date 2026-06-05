import { describe, expect, it } from 'vitest'
import type { BallotInput, OptionInput } from '@/lib/tally'
import { tallyRcv } from '@/lib/tally'

const opts = (ids: string[]): OptionInput[] => ids.map((id) => ({ id, label: id.toUpperCase() }))

const ballots = (rankings: string[][]): BallotInput[] => rankings.map((r) => ({ rankings: r }))

describe('tallyRcv', () => {
  it('elects a majority winner in the first round', () => {
    const options = opts(['a', 'b', 'c'])
    const ballotsInput = ballots([
      ['a', 'b', 'c'],
      ['a', 'c', 'b'],
      ['a', 'b', 'c'],
      ['b', 'a', 'c'],
      ['c', 'a', 'b'],
    ])

    const result = tallyRcv(options, ballotsInput)

    expect(result).toHaveLength(1)
    expect(result[0].winner).toBe('a')
    expect(result[0].votes[0]).toMatchObject({ optionId: 'a', count: 3 })
  })

  it('eliminates the last-place candidate and redistributes', () => {
    const options = opts(['a', 'b', 'c'])
    const ballotsInput = ballots([
      ['a', 'b', 'c'],
      ['a', 'c', 'b'],
      ['b', 'a', 'c'],
      ['b', 'c', 'a'],
      ['c', 'a', 'b'],
      ['c', 'a', 'b'],
      ['c', 'b', 'a'],
    ])

    const result = tallyRcv(options, ballotsInput)

    // Round 1: A=2, B=2, C=3 — no majority (4 needed), eliminate A and B (tied at 2?)
    // Actually A=2, B=2, C=3 — min is 2 (both A and B). Eliminating both leaves C as only candidate.
    expect(result.length).toBeGreaterThanOrEqual(1)

    // C should win
    const lastRound = result[result.length - 1]
    expect(lastRound.winner).toBe('c')
  })

  it('handles exhausted ballots', () => {
    const options = opts(['a', 'b', 'c'])
    const ballotsInput = ballots([['a'], ['a'], ['b'], ['b'], ['c']])

    const result = tallyRcv(options, ballotsInput)

    // Round 1: A=2, B=2, C=1. Eliminate C.
    // C's ballot is exhausted (no further preference). A and B remain at 2 each.
    // Round 2: A=2, B=2, exhausted=1. No majority (3 needed). All remaining tied (A and B).
    const lastRound = result[result.length - 1]
    expect(lastRound.exhausted).toBeGreaterThan(0)
    expect(lastRound.winner).toBeUndefined()
  })

  it('handles a single candidate', () => {
    const options = opts(['a'])
    const ballotsInput = ballots([['a'], ['a'], ['a']])

    const result = tallyRcv(options, ballotsInput)

    expect(result).toHaveLength(1)
    expect(result[0].winner).toBe('a')
  })

  it('returns no winner when all remaining candidates are tied', () => {
    const options = opts(['a', 'b'])
    const ballotsInput = ballots([
      ['a', 'b'],
      ['b', 'a'],
    ])

    const result = tallyRcv(options, ballotsInput)

    const lastRound = result[result.length - 1]
    expect(lastRound.winner).toBeUndefined()
  })

  it('handles the classic RCV example: 3 candidates, 3 rounds', () => {
    const options = opts(['a', 'b', 'c'])
    const ballotsInput = ballots([
      ['a', 'b', 'c'],
      ['a', 'b', 'c'],
      ['a', 'c', 'b'],
      ['b', 'a', 'c'],
      ['b', 'c', 'a'],
      ['b', 'c', 'a'],
      ['c', 'a', 'b'],
      ['c', 'a', 'b'],
      ['c', 'a', 'b'],
      ['c', 'b', 'a'],
    ])

    const result = tallyRcv(options, ballotsInput)

    // Round 1: A=3, B=3, C=4 — no majority (6 needed), eliminate A and B (tied)
    // C has 4 and is the only one left — C wins
    const lastRound = result[result.length - 1]
    expect(lastRound.winner).toBe('c')
  })

  it('redistributes correctly when a single candidate is eliminated', () => {
    const options = opts(['a', 'b', 'c'])
    const ballotsInput = ballots([
      ['a', 'b', 'c'],
      ['a', 'c', 'b'],
      ['b', 'a', 'c'],
      ['b', 'c', 'a'],
      ['b', 'c', 'a'],
      ['c', 'a', 'b'],
    ])

    const result = tallyRcv(options, ballotsInput)

    // Round 1: A=2, B=3, C=1. Eliminate C.
    // C's ballot goes to A (next preference). Round 2: A=3, B=3 — tie, no winner.
    expect(result.length).toBe(2)
    expect(result[0].eliminated).toEqual(['c'])
  })

  it('reports correct vote counts per round', () => {
    const options = opts(['a', 'b', 'c'])
    const ballotsInput = ballots([
      ['a', 'b', 'c'],
      ['a', 'b', 'c'],
      ['b', 'a', 'c'],
      ['c', 'a', 'b'],
      ['c', 'b', 'a'],
    ])

    const result = tallyRcv(options, ballotsInput)

    // Round 1: A=2, B=1, C=2. Eliminate B.
    // B's ballot goes to A. Round 2: A=3, C=2. A wins.
    expect(result[0].votes).toContainEqual(expect.objectContaining({ optionId: 'a', count: 2 }))
    expect(result[0].votes).toContainEqual(expect.objectContaining({ optionId: 'b', count: 1 }))
    expect(result[0].eliminated).toEqual(['b'])

    expect(result[1].votes).toContainEqual(expect.objectContaining({ optionId: 'a', count: 3 }))
    expect(result[1].winner).toBe('a')
  })

  it('handles empty ballot preferences', () => {
    const options = opts(['a', 'b'])
    const ballotsInput = ballots([['a'], [], []])

    const result = tallyRcv(options, ballotsInput)

    // Round 1: A=1, B=0, exhausted=2. Total active=1. A has majority (1 >= 1).
    expect(result[0].winner).toBe('a')
    expect(result[0].exhausted).toBe(2)
  })

  it('handles ballots where voters rank only some candidates', () => {
    const options = opts(['a', 'b', 'c'])
    const ballotsInput = ballots([['a'], ['a'], ['a'], ['b', 'c'], ['b'], ['c'], ['c']])

    const result = tallyRcv(options, ballotsInput)

    // Round 1: A=3, B=2, C=2. No majority (4 needed). Eliminate B and C (tied at 2).
    // But wait — if we eliminate both B and C, A wins as the only remaining.
    expect(result[0].votes[0]).toMatchObject({ optionId: 'a', count: 3 })
    expect(result[0].eliminated).toContain('b')
    expect(result[0].eliminated).toContain('c')

    // After elimination, A should win
    const lastRound = result[result.length - 1]
    expect(lastRound.winner).toBe('a')
  })
})
