import type { ReactNode } from 'react'

export interface ChartSegment {
  value: number
  /** short text read by assistive tech and shown on hover, e.g. "Yes", "No". */
  label: string
  /** tailwind background classes for this segment. */
  className: string
}

export interface ChartBar {
  /** option label. */
  label: string
  /** one or more stacked segments. One segment = simple count bar; two = yes/no split. */
  segments: ChartSegment[]
  /** optional trailing text shown to the right of the bar, e.g. "12" or "PASSED". */
  caption?: ReactNode
}

interface BarChartProps {
  bars: ChartBar[]
  /**
   * 'absolute': every bar is scaled to the largest bar total across the chart
   *   (compares options against each other - approval counts, round vote counts).
   * 'relative': each bar fills its full width and segment widths are a share of
   *   that bar's own total (a 0-100% share view - yes/no results).
   */
  mode?: 'absolute' | 'relative'
  /** 0-100; in relative mode, draws a threshold marker line at this percentage. */
  thresholdPct?: number
  thresholdLabel?: string
  /** accessible summary for the whole chart (container role="img"). */
  ariaLabel: string
  /** className applied to the outer wrapper. */
  className?: string
}

export default function BarChart({
  bars,
  mode = 'absolute',
  thresholdPct,
  thresholdLabel,
  ariaLabel,
  className,
}: BarChartProps) {
  if (bars.length === 0) return null

  const maxTotal = Math.max(...bars.map((b) => b.segments.reduce((s, seg) => s + seg.value, 0)), 1)

  return (
    <div role="img" aria-label={ariaLabel} className={className}>
      <ul className="space-y-2">
        {bars.map((bar) => {
          const total = bar.segments.reduce((s, seg) => s + seg.value, 0)
          const scale = mode === 'relative' ? total || 1 : maxTotal
          const showThreshold = mode === 'relative' && thresholdPct !== undefined

          return (
            <li key={bar.label} className="flex items-center gap-2">
              <span className="w-24 shrink-0 truncate text-xs text-zinc-700" title={bar.label}>
                {bar.label}
              </span>

              <div className="relative h-6 flex-1 overflow-hidden rounded bg-zinc-100">
                <div className="flex h-full w-full">
                  {bar.segments.map((seg) => {
                    const pct = (seg.value / scale) * 100
                    if (pct <= 0) return null
                    return (
                      <div
                        key={seg.label}
                        className={`h-full ${seg.className}`}
                        style={{ width: `${pct}%` }}
                        title={`${seg.label}: ${seg.value}`}
                      />
                    )
                  })}
                </div>

                {showThreshold && (
                  <div
                    className="absolute inset-y-0 z-10 border-l-2 border-dashed border-zinc-500"
                    style={{ left: `${thresholdPct}%` }}
                    title={thresholdLabel ?? `Threshold: ${thresholdPct}%`}
                  />
                )}
              </div>

              {bar.caption !== undefined && (
                <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums text-zinc-600">
                  {bar.caption}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
