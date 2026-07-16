import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ResultsView from '@/components/results-view'
import type { OptionInput } from '@/lib/tally'

const opts = (ids: string[]): OptionInput[] => ids.map((id) => ({ id, label: id.toUpperCase() }))

function ballots(rankings: unknown[]) {
  return rankings.map((rankings, i) => ({ id: `b${i}`, rankings }))
}

describe('ResultsView charts', () => {
  it('renders a round chart for ranked-choice (rcv)', () => {
    const options = opts(['a', 'b', 'c'])
    const submitted = ballots([
      ['a', 'b', 'c'],
      ['a', 'c', 'b'],
      ['a', 'b', 'c'],
      ['b', 'a', 'c'],
      ['c', 'a', 'b'],
    ])

    render(
      <ResultsView
        method="rcv"
        options={options}
        ballots={submitted}
        cfg={{ seats: 1, threshold: 50 }}
        showBallots={false}
      />,
    )

    expect(screen.getByRole('img', { name: 'Round 1 vote counts' })).toBeDefined()
    expect(screen.getAllByText('A').length).toBeGreaterThan(0)
    expect(screen.getAllByText('3').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Winner').length).toBeGreaterThan(0)
  })

  it('renders a round chart for STV and shows the quota', () => {
    const options = opts(['a', 'b', 'c'])
    const submitted = ballots([
      ['a', 'b', 'c'],
      ['a', 'b', 'c'],
      ['a', 'b', 'c'],
      ['a', 'b', 'c'],
      ['b', 'a', 'c'],
      ['b', 'a', 'c'],
      ['c', 'a', 'b'],
    ])

    render(
      <ResultsView
        method="stv"
        options={options}
        ballots={submitted}
        cfg={{ seats: 2, threshold: 50 }}
        showBallots={false}
      />,
    )

    expect(screen.getByRole('img', { name: 'Round 1 vote counts' })).toBeDefined()
    expect(screen.getAllByText('Quota: 3').length).toBeGreaterThan(0)
  })

  it('renders an approval chart with per-option counts', () => {
    const options = opts(['a', 'b'])
    const submitted = ballots([['a'], ['a', 'b']])

    render(
      <ResultsView
        method="approval"
        options={options}
        ballots={submitted}
        cfg={{ seats: 1, threshold: 50 }}
        showBallots={false}
      />,
    )

    expect(screen.getByRole('img', { name: 'Approval counts per option' })).toBeDefined()
    expect(screen.getAllByText('A').length).toBeGreaterThan(0)
    expect(screen.getAllByText('B').length).toBeGreaterThan(0)
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
  })

  it('renders a yes/no chart with a threshold marker and keeps the numeric detail', () => {
    const options = opts(['p1', 'p2'])
    const submitted = ballots([
      { p1: 'yes', p2: 'no' },
      { p1: 'yes', p2: 'yes' },
    ])

    render(
      <ResultsView
        method="yesno"
        options={options}
        ballots={submitted}
        cfg={{ seats: 1, threshold: 50 }}
        showBallots={false}
      />,
    )

    expect(screen.getByRole('img', { name: 'Yes and no votes per option' })).toBeDefined()
    expect(screen.getAllByTitle('Threshold: 50% yes').length).toBeGreaterThan(0)
    // raw numbers are retained as accessible supplementary detail
    expect(screen.getAllByText('P1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('P2').length).toBeGreaterThan(0)
    expect(screen.getAllByText('PASSED').length).toBeGreaterThan(0)
  })
})
