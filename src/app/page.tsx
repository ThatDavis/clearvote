import Image from 'next/image'
import Link from 'next/link'
import { VotingMethodCards } from './VotingMethodCards'

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
      <main className="flex max-w-xl flex-col items-center gap-8 text-center">
        <div className="rounded-2xl bg-gradient-to-br from-chicago-blue/10 to-chicago-red/10 mb-2 overflow-hidden">
          <Image src="/logo.svg" alt="clearvote" width={144} height={144} priority />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-chicago-navy sm:text-5xl">
          ClearVote
        </h1>
        <p className="text-lg leading-8 text-zinc-600">
          An open-source, free, poll and general voting system for individuals and community-run
          spaces.
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
            Join
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
          <a
            href="#voting-methods"
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
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            How it works
          </a>
        </div>

        <div id="voting-methods" className="w-full scroll-mt-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Voting Methods
          </p>
          <VotingMethodCards />
        </div>

        <a
          href="https://github.com/ThatDavis/clearvote"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-chicago-blue"
        >
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          Open source on GitHub
        </a>
      </main>
    </div>
  )
}
