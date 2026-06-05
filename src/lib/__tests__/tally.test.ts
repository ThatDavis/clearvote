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

    // Round 1: A=2, B=2, C=3 - no majority (4 needed). A and B tie for last; the
    // Next-Preference Cascade checks which the voters prefer among {A, B} - A on 4
    // ballots, B on 3 - so B is eliminated. Remaining rounds redistribute to C.
    expect(result.length).toBeGreaterThanOrEqual(1)

    // C should win
    const lastRound = result[result.length - 1]
    expect(lastRound.winner).toBe('c')
  })

  it('handles exhausted ballots', () => {
    const options = opts(['a', 'b', 'c'])
    const ballotsInput = ballots([['a'], ['a'], ['b'], ['b'], ['c']])

    const result = tallyRcv(options, ballotsInput)

    // Round 1: A=2, B=2, C=1. C is unique last place and is eliminated; its
    // ballot exhausts (no further preference). Round 2: A=2, B=2, exhausted=1, no
    // majority - a genuine tie with no preference signal, broken by reproducible
    // lot. Exactly one survives and wins; the result is identical on every run.
    const lastRound = result[result.length - 1]
    expect(lastRound.exhausted).toBeGreaterThan(0)
    expect(tallyRcv(options, ballotsInput)).toEqual(result)
    expect(['a', 'b']).toContain(lastRound.winner)
  })

  it('handles a single candidate', () => {
    const options = opts(['a'])
    const ballotsInput = ballots([['a'], ['a'], ['a']])

    const result = tallyRcv(options, ballotsInput)

    expect(result).toHaveLength(1)
    expect(result[0].winner).toBe('a')
  })

  it('breaks a genuine tie by reproducible lot when voters give no signal', () => {
    const options = opts(['a', 'b'])
    const ballotsInput = ballots([
      ['a', 'b'],
      ['b', 'a'],
    ])

    // Round 1: A=1, B=1, and the ballots are perfectly symmetric, so the cascade
    // finds no preference signal. The tie falls back to a seeded lot: the outcome
    // must be a real candidate and identical on every run.
    const first = tallyRcv(options, ballotsInput)
    const second = tallyRcv(options, ballotsInput)
    expect(first).toEqual(second)
    expect(['a', 'b']).toContain(first[first.length - 1].winner)
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

    // Round 1: A=3, B=3, C=4 - no majority (6 needed). A and B tie for last; among
    // {A, B} voters prefer A on 6 ballots and B on 4, so the cascade eliminates B.
    // Remaining rounds redistribute to C, who wins.
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

    // Round 1: A=2, B=3, C=1. C is the unique last place and is eliminated.
    // C's ballot ([c,a,b]) redistributes to A, leaving A=3, B=3 - a genuine tie
    // with no preference signal between them, broken by reproducible lot.
    expect(result[0].eliminated).toEqual(['c'])
    expect(tallyRcv(options, ballotsInput)).toEqual(result)
    expect(['a', 'b']).toContain(result[result.length - 1].winner)
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

    // Round 1: A=3, B=2, C=2. B and C tie for last with no preference signal
    // between them (the A-only ballots rank neither), so the lot decides which is
    // eliminated. A leads throughout; the result is reproducible.
    expect(result[0].votes[0]).toMatchObject({ optionId: 'a', count: 3 })
    expect(tallyRcv(options, ballotsInput)).toEqual(result)
    expect(result[result.length - 1].winner).toBeDefined()
  })

  it('eliminates the less-preferred tied candidate even when it has the smaller id', () => {
    // A and B tie for last (2 each); C leads (4). Among the {A, B} pair voters
    // prefer A (4 ballots) over B (2), so B is eliminated - the opposite of the
    // old "smallest id wins" rule, which would have dropped A.
    const options = opts(['a', 'b', 'c'])
    const ballotsInput = ballots([['a'], ['a'], ['b'], ['b'], ['c', 'a'], ['c', 'a'], ['c'], ['c']])

    const result = tallyRcv(options, ballotsInput)

    expect(result[0].eliminated).toEqual(['b'])
  })
})
