import { describe, expect, it } from 'vitest'
import { ballotSeed, breakEliminationTie, seededOrder, type WeightedBallot } from '@/lib/tiebreak'

const wb = (rankings: string[][]): WeightedBallot[] => rankings.map((r) => ({ rankings: r }))

describe('seededOrder', () => {
  it('is deterministic for the same ids and seed', () => {
    expect(seededOrder(['a', 'b', 'c'], 'seed')).toEqual(seededOrder(['a', 'b', 'c'], 'seed'))
  })

  it('does not depend on the order ids are passed in', () => {
    const seed = 'x>y|y>x'
    expect(seededOrder(['a', 'b', 'c'], seed)).toEqual(seededOrder(['c', 'a', 'b'], seed))
  })

  it('returns a permutation of the input set', () => {
    expect([...seededOrder(['a', 'b', 'c'], 's')].sort()).toEqual(['a', 'b', 'c'])
  })
})

describe('breakEliminationTie', () => {
  it('returns the only candidate when the set has one', () => {
    expect(breakEliminationTie(['a'], wb([['a']]), 'seed')).toBe('a')
  })

  it('eliminates the candidate fewer voters prefer among the tied set', () => {
    // a preferred over b on 2 of 3 ballots -> b is least preferred.
    const ballots = wb([
      ['a', 'b'],
      ['a', 'b'],
      ['b', 'a'],
    ])
    expect(breakEliminationTie(['a', 'b'], ballots, ballotSeed(ballots))).toBe('b')
  })

  it('is blind to candidate id order (same outcome regardless of how the tie is passed)', () => {
    const ballots = wb([
      ['a', 'b'],
      ['a', 'b'],
      ['b', 'a'],
    ])
    const seed = ballotSeed(ballots)
    expect(breakEliminationTie(['b', 'a'], ballots, seed)).toBe('b')
    expect(breakEliminationTie(['a', 'b'], ballots, seed)).toBe('b')
  })

  it('cascades: narrows the tied set and re-checks the next preference', () => {
    // First level: a, b each preferred once, c preferred 3x -> least preferred {a, b}.
    // Narrow to {a, b}: the [c, a] ballot now backs a, so a=2, b=1 -> eliminate b.
    const ballots = wb([['a'], ['b'], ['c'], ['c'], ['c', 'a']])
    expect(breakEliminationTie(['a', 'b', 'c'], ballots, ballotSeed(ballots))).toBe('b')
  })

  it('respects ballot weights (STV)', () => {
    // Unweighted this is a 1-1 tie; b carries more weight, so a is least preferred.
    const ballots: WeightedBallot[] = [
      { rankings: ['a', 'b'], weight: 0.2 },
      { rankings: ['b', 'a'], weight: 1 },
    ]
    expect(breakEliminationTie(['a', 'b'], ballots, ballotSeed(ballots))).toBe('a')
  })

  it('falls back to a reproducible lot when voters give no signal', () => {
    // Perfectly symmetric ballots -> no preference signal.
    const ballots = wb([
      ['a', 'b'],
      ['b', 'a'],
    ])
    const seed = ballotSeed(ballots)
    const first = breakEliminationTie(['a', 'b'], ballots, seed)
    const second = breakEliminationTie(['a', 'b'], ballots, seed)
    expect(first).toBe(second) // reproducible
    expect(['a', 'b']).toContain(first)
  })
})
