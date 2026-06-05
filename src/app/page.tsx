import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
      <main className="flex max-w-xl flex-col items-center gap-8 text-center">
        <div className="rounded-2xl bg-gradient-to-br from-chicago-blue/10 to-chicago-red/10 mb-2 overflow-hidden">
          <Image src="/logo.svg" alt="clearvote" width={144} height={144} priority />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-chicago-navy sm:text-5xl">
          clearvote
        </h1>
        <p className="text-lg leading-8 text-zinc-600">
          A simple ranked-choice voting system for community-run spaces.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/polls/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-chicago-red px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-chicago-red-dark hover:shadow-xl hover:-translate-y-0.5"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create a poll
          </Link>
          <Link
            href="/verify"
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-zinc-200 bg-white px-6 py-3.5 text-sm font-semibold text-zinc-700 transition-all hover:border-chicago-blue hover:text-chicago-blue hover:shadow-md"
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Verify a vote
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'Ranked Choice', desc: 'Instant runoff voting' },
            { label: 'Multi-winner', desc: 'Proportional representation' },
            { label: 'Approval', desc: 'Vote for all you like' },
          ].map((feature) => (
            <div key={feature.label} className="rounded-lg bg-zinc-50 px-3 py-4">
              <p className="text-sm font-semibold text-chicago-navy">{feature.label}</p>
              <p className="mt-1 text-xs text-zinc-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
