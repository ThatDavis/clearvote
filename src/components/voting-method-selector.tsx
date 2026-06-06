'use client'

import { useState } from 'react'
import { ALL_METHODS } from '@/lib/voting-methods'

interface VotingMethodSelectorProps {
  value: string
  onChange: (value: string) => void
}

export default function VotingMethodSelector({ value, onChange }: VotingMethodSelectorProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const activeMethod = ALL_METHODS.find((m) => m.id === value)
  const hoveredMethod = ALL_METHODS.find((m) => m.id === hoveredId)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {ALL_METHODS.map((method) => (
          <button
            key={method.id}
            type="button"
            onClick={() => onChange(method.id)}
            onMouseEnter={() => setHoveredId(method.id)}
            onMouseLeave={() => setHoveredId(null)}
            onFocus={() => setHoveredId(method.id)}
            onBlur={() => setHoveredId(null)}
            className={`
              relative rounded-full px-4 py-2 text-sm font-medium transition-all duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-chicago-blue focus-visible:ring-offset-2
              ${
                value === method.id
                  ? 'bg-chicago-red text-white shadow-md hover:bg-chicago-red-dark'
                  : 'bg-white text-zinc-700 border border-zinc-300 hover:border-chicago-blue hover:text-chicago-blue'
              }
            `}
          >
            {method.label}
          </button>
        ))}
      </div>

      {/* Tooltip / Description area */}
      <div className="relative min-h-[120px] rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 transition-all duration-300">
        {(hoveredMethod || activeMethod) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-chicago-navy">
                {(hoveredMethod || activeMethod)?.label}
              </span>
              {hoveredMethod && hoveredMethod.id !== value && (
                <span className="rounded-full bg-chicago-blue/10 px-2 py-0.5 text-xs text-chicago-blue">
                  Preview
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed text-zinc-600">
              {(hoveredMethod || activeMethod)?.fullDesc}
            </p>
            <p className="text-xs text-chicago-blue font-medium">
              Best for: {(hoveredMethod || activeMethod)?.bestFor}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
