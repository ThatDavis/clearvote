import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About - ClearVote',
  description:
    'ClearVote is a simple, self-hostable voting system built around Ranked Choice Voting, for small community-run organizations.',
}

export default function AboutPage() {
  return (
    <div className="-mt-[60px] bg-chicago-navy pt-[60px]">
      <div className="mx-auto w-[80%]">
        {/* HERO */}
        <section className="relative overflow-hidden bg-chicago-navy text-white">
          {/* Faint grid + decorative blobs, matching the home + method pages. */}
          <div
            className="absolute inset-0 -z-10 text-white opacity-[0.04]"
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
          <div
            aria-hidden="true"
            className="absolute -translate-x-1/2 top-1/3 left-1/2 h-72 w-72 rounded-full bg-accent-lime/10 blur-3xl"
          />

          <div className="px-6 py-20">
            <p className="mb-4 text-[11px] font-semibold tracking-[0.2em] text-white/70 uppercase">
              About
            </p>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              About ClearVote.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-white/80">
              A side project to make ranked-choice voting something small groups can actually use.
            </p>
          </div>
        </section>

        {/* BODY */}
        <section className="rounded-t-[2.5rem] bg-surface-warm pb-20 pt-16 shadow-[0_-20px_60px_rgba(0,0,0,0.1)]">
          <div className="mx-auto max-w-2xl space-y-10 px-6">
            <div>
              <h2 className="mb-3 font-display text-2xl font-bold text-chicago-navy">
                Why this exists
              </h2>
              <p className="text-lg leading-relaxed text-zinc-700">
                ClearVote started as a fun side project with a serious goal: a simple, self-hostable
                voting system built around Ranked Choice Voting (RCV), so more small groups could
                actually try fairer voting methods.
              </p>
            </div>

            <div>
              <h2 className="mb-3 font-display text-2xl font-bold text-chicago-navy">
                Why ranked choice?
              </h2>
              <p className="text-lg leading-relaxed text-zinc-700">
                RCV lets voters rank candidates in order of preference and elects the candidate with
                the broadest support. There are plenty of great resources to learn more - the CGP
                Grey explainer video, the Ranked Choice Voting Resource Center, and{' '}
                <a
                  href="https://fairvote.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-chicago-blue underline decoration-chicago-blue/30 underline-offset-2 transition-colors hover:text-chicago-blue-dark hover:decoration-chicago-blue"
                >
                  FairVote.org
                </a>
                , among many others.
              </p>
            </div>

            <div>
              <h2 className="mb-3 font-display text-2xl font-bold text-chicago-navy">
                Who it&apos;s for
              </h2>
              <p className="text-lg leading-relaxed text-zinc-700">
                Let&apos;s be the change we want to see in our governments by adopting fair voting
                methods wherever we can. ClearVote is built for small community-run organizations -
                clubs, hackerspaces, co-ops, even just groups of friends. For the tech-savvy,
                there&apos;s a self-hostable option. For everyone else, this service stays free.
              </p>
            </div>

            <div className="rounded-2xl bg-chicago-navy p-8 text-center">
              <p className="mb-4 text-lg text-white">Have ideas? Want to contribute?</p>
              <a
                href="https://github.com/ThatDavis/clearvote"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-chicago-red px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-chicago-red-dark"
              >
                <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                View on GitHub
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
