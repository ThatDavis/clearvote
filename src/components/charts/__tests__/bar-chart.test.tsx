import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ChartBar } from '@/components/charts/bar-chart'
import BarChart from '@/components/charts/bar-chart'

describe('BarChart', () => {
  it('renders nothing when there are no bars', () => {
    const { container } = render(<BarChart bars={[]} ariaLabel="empty chart" />)
    expect(container.firstChild).toBeNull()
  })

  it('exposes the chart to assistive tech via role=img and aria-label', () => {
    const bars: ChartBar[] = [
      {
        label: 'A',
        segments: [{ value: 3, label: 'Votes', className: 'bg-chicago-navy' }],
        caption: 3,
      },
    ]
    render(<BarChart bars={bars} ariaLabel="approval counts per option" />)
    expect(screen.getByRole('img', { name: 'approval counts per option' })).toBeDefined()
  })

  it('scales bars to the largest total in absolute mode and shows counts', () => {
    const bars: ChartBar[] = [
      {
        label: 'A',
        segments: [{ value: 3, label: 'Votes', className: 'bg-chicago-navy' }],
        caption: 3,
      },
      {
        label: 'B',
        segments: [{ value: 1, label: 'Votes', className: 'bg-chicago-navy' }],
        caption: 1,
      },
    ]
    render(<BarChart bars={bars} ariaLabel="counts" />)

    // labels and counts are visible text
    expect(screen.getByText('A')).toBeDefined()
    expect(screen.getByText('B')).toBeDefined()
    expect(screen.getAllByText('3').length).toBeGreaterThan(0)

    // the largest bar fills the track; the smaller bar is shorter
    const a = screen.getByTitle('Votes: 3')
    const b = screen.getByTitle('Votes: 1')
    expect(a).toHaveStyle({ width: '100%' })
    expect(parseFloat(b.style.width)).toBeLessThan(100)
  })

  it('renders each bar at 100% with a threshold marker in relative mode', () => {
    const bars: ChartBar[] = [
      {
        label: 'Question 1',
        segments: [
          { value: 6, label: 'Yes', className: 'bg-green-500' },
          { value: 4, label: 'No', className: 'bg-red-500' },
        ],
      },
    ]
    const { container } = render(
      <BarChart
        bars={bars}
        mode="relative"
        thresholdPct={50}
        thresholdLabel="Threshold: 50% yes"
        ariaLabel="yes and no votes"
      />,
    )

    expect(screen.getByTitle('Yes: 6')).toHaveStyle({ width: '60%' })
    expect(screen.getByTitle('No: 4')).toHaveStyle({ width: '40%' })
    expect(screen.getByTitle('Threshold: 50% yes')).toHaveStyle({ left: '50%' })

    // no per-bar caption column was passed, so none should render
    const captions = container.querySelectorAll('.tabular-nums')
    expect(captions.length).toBe(0)
  })

  it('skips zero-value segments', () => {
    const bars: ChartBar[] = [
      {
        label: 'Unanimous',
        segments: [
          { value: 5, label: 'Yes', className: 'bg-green-500' },
          { value: 0, label: 'No', className: 'bg-red-500' },
        ],
      },
    ]
    render(<BarChart bars={bars} mode="relative" ariaLabel="yes only" />)

    expect(screen.getByTitle('Yes: 5')).toHaveStyle({ width: '100%' })
    expect(screen.queryByTitle('No: 0')).toBeNull()
  })

  it('applies the caller-supplied segment className (e.g. winner highlight)', () => {
    const bars: ChartBar[] = [
      {
        label: 'A',
        segments: [{ value: 2, label: 'Votes', className: 'bg-green-500' }],
        caption: 2,
      },
    ]
    render(<BarChart bars={bars} ariaLabel="winner highlight" />)
    expect(screen.getByTitle('Votes: 2')).toHaveClass('bg-green-500')
  })
})
