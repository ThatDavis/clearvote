'use client'

import { useState } from 'react'

interface VotingMethod {
  id: string
  label: string
  shortDesc: string
  fullDesc: string
  bestFor: string
}

const methods: VotingMethod[] = [
  {
    id: 'rcv',
    label: 'Ranked Choice',
    shortDesc: 'Rank candidates in order',
    fullDesc:
      'Voters rank candidates from first to last choice. If no one wins a majority, the last-place candidate is eliminated and their votes transfer to the next choice. Repeat until someone has a majority.',
    bestFor: 'Electing a single winner when you want broad consensus',
  },
  {
    id: 'stv',
    label: 'Multi-winner',
    shortDesc: 'Rank candidates, multiple winners',
    fullDesc:
      'Like ranked choice, but elects multiple winners. Surplus votes from winners and eliminated candidates transfer proportionally. Ensures diverse representation.',
    bestFor: 'Electing boards, committees, or councils',
  },
  {
    id: 'approval',
    label: 'Approval',
    shortDesc: 'Vote for any number you like',
    fullDesc:
      'Voters can select as many candidates as they approve of. The candidate with the most approvals wins. Simple, fast, and reduces strategic voting.',
    bestFor: 'Quick decisions or when simplicity matters most',
  },
  {
    id: 'yesno',
    label: 'Yes / No',
    shortDesc: 'Approve or reject each option',
    fullDesc:
      'Each option is voted on individually as a yes or no. Options that meet the pass threshold are approved. Great for referendums or multiple proposals.',
    bestFor: 'Referendums, bylaw changes, or multiple proposals',
  },
]

interface VotingMethodSelectorProps {
  value: string
  onChange: (value: string) => void
}

export default function VotingMethodSelector({ value, onChange }: VotingMethodSelectorProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const activeMethod = methods.find((m) => m.id === value)
  const hoveredMethod = methods.find((m) => m.id === hoveredId)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {methods.map((method) => (
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
