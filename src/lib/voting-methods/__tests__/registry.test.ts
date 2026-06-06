import { describe, it, expect } from 'vitest'
import { ALL_METHODS, VOTING_METHODS, getMethod } from '..'
import { tallyRcv } from '@/lib/tally'
import { tallyStv } from '@/lib/stv'
import { tallyApproval } from '@/lib/approval'
import { tallyYesNo } from '@/lib/yesno'

const options = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
]

const rcvBallots = [
  { rankings: ['a', 'b', 'c'] },
  { rankings: ['b', 'a', 'c'] },
  { rankings: ['a', 'c', 'b'] },
]

const stvBallots = [
  { rankings: ['a', 'b', 'c'] },
  { rankings: ['b', 'a', 'c'] },
  { rankings: ['a', 'c', 'b'] },
  { rankings: ['c', 'b', 'a'] },
]

const approvalBallots = [
  { rankings: ['a', 'b'] },
  { rankings: ['b', 'c'] },
  { rankings: ['a'] },
]

const yesnoBallots = [
  { rankings: { a: 'yes', b: 'no', c: 'abstain' } },
  { rankings: { a: 'yes', b: 'yes', c: 'no' } },
  { rankings: { a: 'no', b: 'yes', c: 'yes' } },
]

describe('voting-method registry', () => {
  it('id matches its key', () => {
    for (const [k, m] of Object.entries(VOTING_METHODS)) expect(m.id).toBe(k)
  })

  it('every method is fully specified', () => {
    for (const m of ALL_METHODS) {
      expect(m.minOptions).toBeGreaterThanOrEqual(1)
      expect(typeof m.tally).toBe('function')
      expect(typeof m.validateBallot).toBe('function')
      expect(m.BallotComponent).toBeDefined()
    }
  })

  it('rcv adapter equals tallyRcv', () => {
    const adapter = getMethod('rcv').tally(options, rcvBallots, { seats: 1, threshold: 50 })
    const direct = tallyRcv(options, rcvBallots)
    expect(adapter.kind).toBe('rcv')
    expect((adapter as { rounds: unknown[] }).rounds).toEqual(direct)
  })

  it('stv adapter equals tallyStv', () => {
    const adapter = getMethod('stv').tally(options, stvBallots, { seats: 2, threshold: 50 })
    const direct = tallyStv(options, stvBallots, 2)
    expect(adapter.kind).toBe('stv')
    expect((adapter as { rounds: unknown[] }).rounds).toEqual(direct)
  })

  it('approval adapter equals tallyApproval', () => {
    const adapter = getMethod('approval').tally(options, approvalBallots, { seats: 1, threshold: 50 })
    const direct = tallyApproval(options, approvalBallots, 1)
    expect(adapter.kind).toBe('approval')
    expect((adapter as { result: unknown }).result).toEqual(direct)
  })

  it('yesno adapter equals tallyYesNo', () => {
    const adapter = getMethod('yesno').tally(options, yesnoBallots, { seats: 1, threshold: 50 })
    const direct = tallyYesNo(options, yesnoBallots, 50)
    expect(adapter.kind).toBe('yesno')
    expect((adapter as { result: unknown }).result).toEqual(direct)
  })

  it('getMethod falls back to rcv for unknown id', () => {
    expect(getMethod('unknown').id).toBe('rcv')
  })
})
