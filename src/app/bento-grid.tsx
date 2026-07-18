import Link from 'next/link'
import type { ReactNode } from 'react'
import { ALL_METHODS } from '@/lib/voting-methods'

type SupportingCard = {
  title: string
  body: string
  icon: ReactNode
  href?: string
  external?: boolean
}

const SUPPORTING_CARDS: SupportingCard[] = [
  {
    title: '100% open source',
    body: 'MIT Licence. Self-host in one Docker container. No vendor lock-in, no telemetry, no surprises.',
    href: 'https://github.com/ThatDavis/clearvote',
    external: true,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
      />
    ),
  },
  {
    title: 'SHA-256 receipts',
    body: 'Every ballot gets a 128-bit random receipt. Verify yours was counted without breaking anonymity.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    title: 'Anonymous ballots',
    body: 'No voter identity stored on Ballot rows. Eligibility tracked separately. Secrecy by design.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    ),
  },
]

export function BentoGrid() {
  return (
    <div className="flex flex-col gap-4">
      {/* Voting-method cards: 4 wide on lg, 2 on sm, 1 on mobile. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ALL_METHODS.map((method) => (
          <Link
            key={method.id}
            href={`/method/${method.id}`}
            className="group relative flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200/60 transition-all hover:-translate-y-0.5 hover:ring-chicago-blue/30 hover:shadow-lg"
          >
            <svg
              aria-hidden="true"
              className="absolute right-5 top-5 h-4 w-4 text-zinc-300 transition-colors group-hover:text-chicago-blue"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-gold-muted uppercase">
              Voting method
            </p>
            <p className="mt-2 font-display text-2xl font-bold text-chicago-navy">{method.label}</p>
            <p className="mt-2 text-sm text-text-muted">{method.shortDesc}</p>
            <p className="mt-4 text-xs text-zinc-500 italic">Best for: {method.bestFor}</p>
          </Link>
        ))}
      </div>

      {/* Supporting feature cards: 3 wide on lg, 2 on sm, 1 on mobile. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SUPPORTING_CARDS.map((card) => {
          const inner = (
            <div className="flex h-full flex-col rounded-2xl bg-surface-warm-2 p-6 ring-1 ring-zinc-200/60 transition-all group-hover:-translate-y-0.5 group-hover:ring-chicago-blue/30 group-hover:shadow-lg">
              <svg
                aria-hidden="true"
                className="mb-4 h-5 w-5 text-chicago-blue"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {card.icon}
              </svg>
              <p className="font-display text-2xl font-bold text-chicago-navy">{card.title}</p>
              <p className="mt-2 text-sm text-text-muted">{card.body}</p>
            </div>
          )

          if (card.href) {
            return (
              <a
                key={card.title}
                href={card.href}
                target={card.external ? '_blank' : undefined}
                rel={card.external ? 'noopener noreferrer' : undefined}
                className="group block"
              >
                {inner}
              </a>
            )
          }

          return (
            <div key={card.title} className="group h-full">
              {inner}
            </div>
          )
        })}
      </div>
    </div>
  )
}
