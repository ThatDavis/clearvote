'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import DeleteElectionButton from '@/app/elections/[slug]/delete-election-button'
import DeletePollButton from '@/app/polls/[slug]/delete-poll-button'
import EmptyState from '@/components/empty-state'

interface Poll {
  id: string
  title: string
  slug: string
  status: string
  votingMethod: string
  endsAt: Date | null
  _count: { ballots: number; tokens: number }
}

interface Election {
  id: string
  title: string
  slug: string
  status: string
  contests: { id: string }[]
  _count: { receipts: number; tokens: number; rolls: number }
}

const methodConfig: Record<string, { label: string; color: string }> = {
  rcv: { label: 'RCV', color: 'text-chicago-blue bg-chicago-blue/10' },
  stv: { label: 'STV', color: 'text-purple-600 bg-purple-50' },
  approval: { label: 'Approval', color: 'text-emerald-600 bg-emerald-50' },
  yesno: { label: 'Y/N', color: 'text-chicago-red bg-chicago-red/10' },
}

function timeRemaining(endsAt: Date | null): string | null {
  if (!endsAt) return null
  const now = new Date()
  const end = new Date(endsAt)
  if (end < now) return 'Ended'
  const diff = end.getTime() - now.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d remaining`
  if (hours > 0) return `${hours}h remaining`
  return 'Ending soon'
}

function PollCard({ poll }: { poll: Poll }) {
  const method = methodConfig[poll.votingMethod]
  const remaining = timeRemaining(poll.endsAt)
  const totalTokens = poll._count.tokens
  const totalBallots = poll._count.ballots
  const turnout = totalTokens > 0 ? Math.round((totalBallots / totalTokens) * 100) : 0

  return (
    <Link
      href={`/polls/${poll.slug}`}
      className="group flex flex-col rounded-xl border-2 border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-chicago-blue/40 hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900 group-hover:text-chicago-navy transition-colors">
          {poll.title}
        </p>
        <span className="inline-flex shrink-0 items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
          Open
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${method?.color || 'text-zinc-600 bg-zinc-100'}`}
        >
          {method?.label || poll.votingMethod}
        </span>
        {remaining && <span className="text-xs text-amber-600 font-medium">{remaining}</span>}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-zinc-50 p-3">
        <div>
          <p className="text-xs text-zinc-500">Votes cast</p>
          <p className="text-lg font-bold text-chicago-navy">{totalBallots}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Turnout</p>
          <p className="text-lg font-bold text-chicago-navy">{turnout}%</p>
        </div>
      </div>
      {totalTokens > 0 && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-chicago-blue transition-all"
              style={{ width: `${Math.min(turnout, 100)}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  )
}

function ClosedPollCard({ poll }: { poll: Poll }) {
  const method = methodConfig[poll.votingMethod]
  return (
    <Link
      href={`/polls/${poll.slug}/results`}
      className="group flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-chicago-blue/30 hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-900 group-hover:text-chicago-navy transition-colors">
          {poll.title}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${method?.color || 'text-zinc-600 bg-zinc-100'}`}
          >
            {method?.label || poll.votingMethod}
          </span>
          <span className="text-xs text-zinc-400">
            {poll._count.ballots} vote{poll._count.ballots !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <span className="ml-3 flex items-center gap-1 text-xs font-medium text-chicago-blue transition-colors group-hover:text-chicago-blue-dark">
        Results
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </Link>
  )
}

function DraftPollCard({ poll }: { poll: Poll }) {
  const method = methodConfig[poll.votingMethod]
  return (
    <div className="group flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-chicago-blue/30 hover:shadow-md hover:-translate-y-0.5">
      <Link href={`/polls/${poll.slug}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-900 group-hover:text-chicago-navy transition-colors">
          {poll.title}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${method?.color || 'text-zinc-600 bg-zinc-100'}`}
          >
            {method?.label || poll.votingMethod}
          </span>
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            Draft
          </span>
        </div>
      </Link>
      <DeletePollButton slug={poll.slug} title={poll.title} />
    </div>
  )
}

function OpenElectionCard({ election }: { election: Election }) {
  const totalBallots = election._count.receipts
  const eligible = election._count.rolls + election._count.tokens
  const turnout = eligible > 0 ? Math.round((totalBallots / eligible) * 100) : 0

  return (
    <Link
      href={`/elections/${election.slug}`}
      className="group flex flex-col rounded-xl border-2 border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-chicago-navy/40 hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900 group-hover:text-chicago-navy transition-colors">
          {election.title}
        </p>
        <span className="inline-flex shrink-0 items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
          Open
        </span>
      </div>
      <div className="mt-2 text-xs text-zinc-500">
        {election.contests.length} contest{election.contests.length !== 1 ? 's' : ''}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-zinc-50 p-3">
        <div>
          <p className="text-xs text-zinc-500">Ballots cast</p>
          <p className="text-lg font-bold text-chicago-navy">{totalBallots}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Turnout</p>
          <p className="text-lg font-bold text-chicago-navy">{turnout}%</p>
        </div>
      </div>
      {eligible > 0 && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-chicago-blue transition-all"
              style={{ width: `${Math.min(turnout, 100)}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  )
}

function ClosedElectionCard({ election }: { election: Election }) {
  return (
    <Link
      href={`/elections/${election.slug}/results`}
      className="group flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-chicago-navy/30 hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-900 group-hover:text-chicago-navy transition-colors">
          {election.title}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-xs text-zinc-400">
            {election._count.receipts} ballot{election._count.receipts !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <span className="ml-3 flex items-center gap-1 text-xs font-medium text-chicago-blue transition-colors group-hover:text-chicago-blue-dark">
        Results
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </Link>
  )
}

function DraftElectionCard({ election }: { election: Election }) {
  return (
    <div className="group flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-chicago-navy/30 hover:shadow-md hover:-translate-y-0.5">
      <Link href={`/elections/${election.slug}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-900 group-hover:text-chicago-navy transition-colors">
          {election.title}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            Draft
          </span>
        </div>
      </Link>
      <DeleteElectionButton slug={election.slug} title={election.title} />
    </div>
  )
}

interface Props {
  org: {
    id: string
    name: string
    slug: string
  }
  isAdmin: boolean
  polls: Poll[]
  elections: Election[]
}

export default function OrgDashboardClient({ org, isAdmin, polls, elections }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') === 'elections' ? 'elections' : 'polls'

  const openPolls = polls.filter((p) => p.status === 'open')
  const closedPolls = polls.filter((p) => p.status === 'closed')
  const draftPolls = polls.filter((p) => p.status === 'draft')

  const openElections = elections.filter((e) => e.status === 'open')
  const closedElections = elections.filter((e) => e.status === 'closed')
  const draftElections = elections.filter((e) => e.status === 'draft')

  function setTab(tab: 'polls' | 'elections') {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`/org/${org.slug}/dashboard?${params.toString()}`)
  }

  return (
    <div className="w-full px-[10%] py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 transition-colors hover:text-chicago-navy"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4 inline mr-1"
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
            Personal
          </Link>
          <span className="text-zinc-300">/</span>
          <h1 className="text-2xl font-bold tracking-tight text-chicago-navy">{org.name}</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-500">Organization dashboard</p>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
          <button
            type="button"
            onClick={() => setTab('polls')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'polls'
                ? 'bg-white text-chicago-navy shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Polls ({polls.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('elections')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'elections'
                ? 'bg-white text-chicago-navy shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Elections ({elections.length})
          </button>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3">
            {activeTab === 'elections' && (
              <Link
                href={`/elections/new?org=${org.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-chicago-navy px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-chicago-navy/90 hover:shadow-md"
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
                New election
              </Link>
            )}
            {activeTab === 'polls' && (
              <Link
                href={`/polls/new?org=${org.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-chicago-red px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-chicago-red-dark hover:shadow-md"
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
                New org poll
              </Link>
            )}
          </div>
        )}
      </div>

      {activeTab === 'polls' ? (
        <div className="space-y-10">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Open polls</h2>
              <span className="text-sm text-zinc-500">{openPolls.length} total</span>
            </div>
            {openPolls.length === 0 ? (
              <EmptyState
                title="No open polls"
                description="Open polls will appear here."
                icon="poll"
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {openPolls.map((poll) => (
                  <PollCard key={poll.id} poll={poll} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Finished polls</h2>
              <span className="text-sm text-zinc-500">{closedPolls.length} total</span>
            </div>
            {closedPolls.length === 0 ? (
              <EmptyState
                title="No finished polls"
                description="Closed polls will appear here."
                icon="poll"
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {closedPolls.map((poll) => (
                  <ClosedPollCard key={poll.id} poll={poll} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Draft polls</h2>
              <span className="text-sm text-zinc-500">{draftPolls.length} total</span>
            </div>
            {draftPolls.length === 0 ? (
              <EmptyState
                title="No drafts"
                description="Draft polls will appear here."
                icon="poll"
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {draftPolls.map((poll) => (
                  <DraftPollCard key={poll.id} poll={poll} />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Open elections</h2>
              <span className="text-sm text-zinc-500">{openElections.length} total</span>
            </div>
            {openElections.length === 0 ? (
              <EmptyState
                title="No open elections"
                description="Open elections will appear here."
                icon="poll"
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {openElections.map((election) => (
                  <OpenElectionCard key={election.id} election={election} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Finished elections</h2>
              <span className="text-sm text-zinc-500">{closedElections.length} total</span>
            </div>
            {closedElections.length === 0 ? (
              <EmptyState
                title="No finished elections"
                description="Closed elections will appear here."
                icon="poll"
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {closedElections.map((election) => (
                  <ClosedElectionCard key={election.id} election={election} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Draft elections</h2>
              <span className="text-sm text-zinc-500">{draftElections.length} total</span>
            </div>
            {draftElections.length === 0 ? (
              <EmptyState
                title="No drafts"
                description="Draft elections will appear here."
                icon="poll"
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {draftElections.map((election) => (
                  <DraftElectionCard key={election.id} election={election} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
