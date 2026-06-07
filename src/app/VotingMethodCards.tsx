'use client'

import { useState } from 'react'
import { ALL_METHODS } from '@/lib/voting-methods'

export function VotingMethodCards() {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="flex w-full flex-col gap-2">
      {ALL_METHODS.map((method) => {
        const isOpen = openId === method.id
        return (
          <button
            key={method.id}
            onClick={() => setOpenId(isOpen ? null : method.id)}
            aria-expanded={isOpen}
            className="w-full rounded-xl border-2 border-transparent bg-zinc-50 px-5 py-4 text-left transition-all hover:border-chicago-blue/20 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-chicago-blue"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-chicago-navy">{method.label}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{method.shortDesc}</p>
              </div>
              <svg
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {isOpen && (
              <div className="mt-3 border-t border-zinc-200 pt-3">
                <p className="text-sm leading-relaxed text-zinc-600">{method.fullDesc}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  <span className="font-semibold text-chicago-navy">Best for:</span> {method.bestFor}
                </p>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
