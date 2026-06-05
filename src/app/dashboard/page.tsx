import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import EmptyState from '@/components/empty-state'
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const myPolls = await prisma.poll.findMany({
    where: { creatorId: session.user.id, organizationId: null },
    include: {
      _count: { select: { ballots: true, tokens: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const myOrganizations = await prisma.organization.findMany({
    where: {
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const myRolls = await prisma.voterRoll.findMany({
    where: { userId: session.user.id },
    include: {
      poll: {
        include: {
          _count: { select: { ballots: true } },
        },
      },
    },
  })

  const votedPollIds = (
    await prisma.ballot.findMany({
      where: {
        userId: session.user.id,
        pollId: { in: myRolls.map((r) => r.pollId) },
      },
      select: { pollId: true },
    })
  ).map((b) => b.pollId)

  const canVote = myRolls.filter(
    (r) => r.poll.status === 'open' && !votedPollIds.includes(r.pollId),
  )

  const hasVoted = myRolls.filter(
    (r) => r.poll.status !== 'draft' && votedPollIds.includes(r.pollId),
  )

  // Split my polls by status
  const openPolls = myPolls.filter((p) => p.status === 'open')
  const closedPolls = myPolls.filter((p) => p.status === 'closed')
  const draftPolls = myPolls.filter((p) => p.status === 'draft')

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    draft: {
      label: 'Draft',
      color: 'text-amber-700',
      bg: 'bg-amber-50',
    },
    open: {
      label: 'Open',
      color: 'text-green-700',
      bg: 'bg-green-50',
    },
    closed: {
      label: 'Closed',
      color: 'text-zinc-600',
      bg: 'bg-zinc-100',
    },
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

  return (
    <div className="w-full px-[10%] py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-chicago-navy">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">Your personal polls</p>
        </div>
        <Link
          href="/polls/new"
          className="inline-flex items-center gap-2 rounded-lg bg-chicago-red px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-chicago-red-dark hover:shadow-md"
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New poll
        </Link>
      </div>

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Your organizations</h2>
          {myOrganizations.length > 0 && (
            <Link
              href="/orgs/new"
              className="text-sm text-chicago-red hover:text-chicago-red-dark transition-colors"
            >
              + Create organization
            </Link>
          )}
        </div>

        {myOrganizations.length === 0 ? (
          <EmptyState
            title="No organizations yet"
            description="Organizations let you run polls with your community, co-op, or team."
            icon="org"
            action={
              <Link
                href="/orgs/new"
                className="inline-flex items-center gap-2 rounded-lg bg-chicago-red px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-chicago-red-dark hover:shadow-md"
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
                Create organization
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myOrganizations.map((org) => (
              <Link
                key={org.id}
                href={`/org/${org.slug}`}
                className="group flex flex-col rounded-xl border-2 border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-chicago-blue/40 hover:shadow-md hover:-translate-y-0.5"
              >
                <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-chicago-navy transition-colors">
                  {org.name}
                </h3>
                {org.description && (
                  <p className="mt-2 text-sm text-zinc-500 line-clamp-2">{org.description}</p>
                )}
                <div className="mt-4 flex items-center gap-1 text-xs text-chicago-blue">
                  <span>Manage organization</span>
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Open polls</h2>
          <span className="text-sm text-zinc-500">{openPolls.length} total</span>
        </div>

        {openPolls.length === 0 ? (
          <EmptyState
            title="No open polls"
            description="Open polls will appear here. Open a draft poll to start collecting votes."
            icon="poll"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {openPolls.map((poll) => {
              const method = methodConfig[poll.votingMethod]
              const remaining = timeRemaining(poll.endsAt)
              const totalTokens = poll._count.tokens
              const totalBallots = poll._count.ballots
              const turnout = totalTokens > 0 ? Math.round((totalBallots / totalTokens) * 100) : 0

              return (
                <Link
                  key={poll.id}
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
                    {remaining && (
                      <span className="text-xs text-amber-600 font-medium">{remaining}</span>
                    )}
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
            })}
          </div>
        )}
      </section>

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Finished polls</h2>
          <span className="text-sm text-zinc-500">{closedPolls.length} total</span>
        </div>

        {closedPolls.length === 0 ? (
          <EmptyState
            title="No finished polls"
            description="Closed polls will appear here once voting ends."
            icon="poll"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {closedPolls.map((poll) => {
              const method = methodConfig[poll.votingMethod]
              return (
                <Link
                  key={poll.id}
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
                        {poll._count.ballots} vote
                        {poll._count.ballots !== 1 ? 's' : ''}
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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Draft polls</h2>
          <span className="text-sm text-zinc-500">{draftPolls.length} total</span>
        </div>

        {draftPolls.length === 0 ? (
          <EmptyState
            title="No drafts"
            description="Draft polls will appear here. Start creating a poll to get going."
            icon="poll"
            action={
              <Link
                href="/polls/new"
                className="inline-flex items-center gap-2 rounded-lg bg-chicago-red px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-chicago-red-dark"
              >
                Create a poll
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {draftPolls.map((poll) => {
              const method = methodConfig[poll.votingMethod]
              return (
                <Link
                  key={poll.id}
                  href={`/polls/${poll.slug}`}
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
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Draft
                      </span>
                    </div>
                  </div>
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5 text-zinc-300 transition-colors group-hover:text-chicago-blue"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        {canVote.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-zinc-900">Polls you can vote on</h2>
            <div className="mt-4 grid gap-3">
              {canVote.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <span className="text-sm font-medium text-zinc-900">{entry.poll.title}</span>
                  <Link
                    href={`/vote/${entry.poll.slug}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-chicago-red px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-chicago-red-dark hover:shadow-md"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Vote
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {hasVoted.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-zinc-900">Voted</h2>
            <div className="mt-4 grid gap-3">
              {hasVoted.map((entry) => {
                const status = statusConfig[entry.poll.status]
                return (
                  <Link
                    key={entry.id}
                    href={`/polls/${entry.poll.slug}/results`}
                    className="group flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-chicago-blue/30 hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-zinc-900">{entry.poll.title}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status?.bg || 'bg-zinc-100'} ${status?.color || 'text-zinc-600'}`}
                      >
                        {status?.label || entry.poll.status}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-medium text-chicago-blue transition-colors group-hover:text-chicago-blue-dark">
                      View results
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
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
