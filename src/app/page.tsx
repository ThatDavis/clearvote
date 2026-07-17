import Link from 'next/link'
import { BentoGrid } from './bento-grid'

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-chicago-navy">
        {/* Parallax background layer: decorative blob field + faint grid.
            Driven by CSS animation-timeline: scroll(root); falls back to static
            for browsers without support or when prefers-reduced-motion is set. */}
        <div className="hero-parallax-bg absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-chicago-blue/15 blur-3xl" />
          <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-chicago-red/15 blur-3xl" />
          <div className="absolute -translate-x-1/2 bottom-0 left-1/2 h-72 w-72 rounded-full bg-accent-lime/10 blur-3xl" />
          <div
            className="absolute inset-0 text-white opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
        </div>

        {/* Hero content - central illustration above, two-zone text below. */}
        <div className="mx-auto max-w-7xl px-6 pb-64 pt-16">
          {/* Central illustration placeholder (upper half of hero).
              Real illustration asset to be wired in Phase 3. */}
          <div className="mx-auto mb-16 flex max-w-3xl justify-center">
            <div className="flex aspect-[3/1] w-full items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-sm">
              <span className="font-mono text-sm text-white/30">[ illustration ]</span>
            </div>
          </div>

          {/* Two-zone text: headline block left (3/5), description + CTAs right (2/5). */}
          <div className="grid grid-cols-1 items-end gap-12 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <p className="mb-6 inline-flex items-center rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] text-white/70 uppercase">
                Open-source - self-hostable
              </p>
              <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
                Voting your
                <br />
                community can
                <br />
                <span className="text-accent-lime">actually trust.</span>
              </h1>
            </div>

            <div className="lg:col-span-2 lg:pb-3">
              <p className="mb-8 text-lg leading-relaxed text-white/80">
                Ranked-choice, STV, approval, and yes/no. Anonymous ballots, cryptographic receipts,
                full audit trails. Self-host in one container.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Link
                  href="/polls/new"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-chicago-red px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-chicago-red-dark hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Start a vote
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
                <Link
                  href="/verify"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-chicago-navy shadow transition-all hover:-translate-y-0.5 hover:bg-zinc-100 hover:shadow-md"
                >
                  Verify a vote
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
            </div>
          </div>
        </div>
      </section>

      {/* OVERLAPPING CARD BAND: large top radius, drops slightly over the hero.
          Intro text centered, bento grid below (refined in next sub-task). */}
      <section
        id="methods"
        className="relative -mt-48 scroll-mt-24 rounded-t-[2.5rem] bg-surface-warm pb-24 pt-20 shadow-[0_-20px_60px_rgba(0,0,0,0.1)] z-10"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="mb-4 font-display text-4xl font-bold text-chicago-navy">
              Four methods. One trustworthy box.
            </p>
            <p className="text-lg text-text-muted">
              Pick the counting rule that fits your election. Each is a pure function - results
              reproducible from raw ballots, no database required.
            </p>
          </div>

          {/* Bento grid: 4 voting-method cards + supporting feature cards. */}
          <BentoGrid />
        </div>
      </section>

      <div className="bg-surface-warm px-6 pb-12">
        <div className="mx-auto max-w-7xl text-center">
          <a
            href="https://github.com/ThatDavis/clearvote"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-chicago-blue"
          >
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            Open source on GitHub
          </a>
        </div>
      </div>
    </>
  )
}
