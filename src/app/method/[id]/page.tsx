import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { VotingMethodDef } from '@/lib/voting-methods'
import { VOTING_METHODS } from '@/lib/voting-methods'

export function generateStaticParams() {
  return Object.keys(VOTING_METHODS).map((id) => ({ id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const method = (VOTING_METHODS as Record<string, VotingMethodDef | undefined>)[id]
  if (!method) return { title: 'Method not found - ClearVote' }
  return {
    title: `${method.label} - ClearVote`,
    description: method.shortDesc,
  }
}

export default async function MethodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const method = (VOTING_METHODS as Record<string, VotingMethodDef | undefined>)[id]
  if (!method) {
    notFound()
  }

  return (
    <>
      <div className="mx-auto max-w-4xl px-6 pt-8">
        <Link
          href="/#methods"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-chicago-navy"
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to methods
        </Link>
      </div>

      <section className="relative overflow-hidden bg-chicago-navy text-white">
        <div
          className="absolute inset-0 -z-10 opacity-[0.04] text-white"
          aria-hidden="true"
          style={{
            backgroundImage:
              'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-chicago-blue/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-chicago-red/15 blur-3xl"
        />
        <div className="mx-auto max-w-4xl px-6 py-16">
          <p className="mb-4 text-[11px] font-semibold tracking-[0.2em] text-white/70 uppercase">
            Voting method
          </p>
          <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl">
            {method.label}
          </h1>
          <p className="mt-4 text-lg text-white/80">{method.shortDesc}</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-10">
          <h2 className="mb-3 font-display text-2xl font-bold text-chicago-navy">How it works</h2>
          <p className="text-lg leading-relaxed text-zinc-700">{method.fullDesc}</p>
        </div>

        <div className="mb-10 rounded-2xl bg-surface-warm-2 p-6">
          <p className="mb-2 text-[11px] font-semibold tracking-[0.2em] text-gold-muted-dark uppercase">
            Best for
          </p>
          <p className="text-lg text-chicago-navy">{method.bestFor}</p>
        </div>

        <div className="mb-10 rounded-2xl border border-zinc-200 bg-white p-6">
          <p className="mb-4 text-[11px] font-semibold tracking-[0.2em] text-gold-muted-dark uppercase">
            Configuration
          </p>
          <dl className="space-y-3">
            <div className="flex justify-between border-b border-zinc-100 pb-2">
              <dt className="text-sm text-zinc-500">Ballot shape</dt>
              <dd className="text-sm font-medium text-chicago-navy">{method.ballotShape}</dd>
            </div>
            <div className="flex justify-between border-b border-zinc-100 pb-2">
              <dt className="text-sm text-zinc-500">Minimum options</dt>
              <dd className="text-sm font-medium text-chicago-navy">{method.minOptions}</dd>
            </div>
            <div className="flex justify-between border-b border-zinc-100 pb-2">
              <dt className="text-sm text-zinc-500">Seats configurable</dt>
              <dd className="text-sm font-medium text-chicago-navy">
                {method.uses.seats ? 'Yes' : 'No'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-zinc-500">Pass threshold configurable</dt>
              <dd className="text-sm font-medium text-chicago-navy">
                {method.uses.threshold ? 'Yes' : 'No'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl bg-chicago-navy p-6 text-center">
          <p className="mb-4 text-lg text-white">Ready to run a {method.label} poll?</p>
          <Link
            href={`/polls/new?method=${method.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-chicago-red px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-chicago-red-dark"
          >
            Create a {method.label} poll
            <svg
              aria-hidden="true"
              className="h-4 w-4"
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
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Worked-example ballot + tally walkthrough coming in Phase 2.
        </p>
      </section>
    </>
  )
}
