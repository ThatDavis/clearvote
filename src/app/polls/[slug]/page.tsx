import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import OrgPollDistributor from './org-poll-distributor'
import PollDistributor from './poll-distributor'
import StatusControls from './status-controls'
import TokenGenerator from './token-generator'
import VoterRollManager from './voter-roll-manager'

export default async function PollPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const poll = await prisma.poll.findUnique({
    where: { slug },
    include: {
      options: {
        orderBy: { order: 'asc' },
      },
      organization: {
        select: { slug: true },
      },
      _count: {
        select: { ballots: true, tokens: true },
      },
    },
  })

  if (!poll) {
    notFound()
  }

  let userCanManage = false
  if (session?.user?.id && poll.creatorId) {
    if (session.user.id === poll.creatorId) {
      userCanManage = true
    } else if (poll.organizationId) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: session.user.id,
            organizationId: poll.organizationId,
          },
        },
      })
      userCanManage = membership?.role === 'admin'
    }
  }

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: 'Draft', color: 'text-amber-700', bg: 'bg-amber-50' },
    open: { label: 'Open', color: 'text-green-700', bg: 'bg-green-50' },
    closed: { label: 'Closed', color: 'text-zinc-600', bg: 'bg-zinc-100' },
  }

  const status = statusConfig[poll.status]

  const methodLabel =
    poll.votingMethod === 'stv'
      ? 'STV'
      : poll.votingMethod === 'approval'
        ? 'Approval'
        : poll.votingMethod === 'yesno'
          ? 'Yes/No'
          : 'RCV'

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 sm:py-12">
      <div className="flex items-center gap-3">
        <Link
          href="/"
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
          Home
        </Link>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status?.bg || 'bg-zinc-100'} ${status?.color || 'text-zinc-700'}`}
        >
          {status?.label || poll.status}
        </span>
      </div>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-chicago-navy">{poll.title}</h1>

      {poll.description && <p className="mt-3 text-zinc-600 leading-relaxed">{poll.description}</p>}

      <div className="mt-8 rounded-xl border-2 border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Options</h2>
        <ol className="mt-3 space-y-2">
          {poll.options.map((option, i) => (
            <li key={option.id} className="flex items-center gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-chicago-blue/10 text-xs font-bold text-chicago-blue">
                {i + 1}
              </span>
              {option.label}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/50 p-5">
        <h3 className="text-sm font-semibold text-zinc-900">Poll details</h3>
        <dl className="mt-3 space-y-2">
          <div className="flex justify-between">
            <dt className="text-sm text-zinc-500">Method</dt>
            <dd className="text-sm font-medium text-zinc-900">
              {methodLabel}
              {poll.votingMethod === 'stv' && ` (${poll.seats} seats)`}
            </dd>
          </div>
          {poll.startsAt && (
            <div className="flex justify-between">
              <dt className="text-sm text-zinc-500">Starts</dt>
              <dd className="text-sm font-medium text-zinc-900">
                {new Date(poll.startsAt).toLocaleString()}
              </dd>
            </div>
          )}
          {poll.endsAt && (
            <div className="flex justify-between">
              <dt className="text-sm text-zinc-500">Ends</dt>
              <dd className="text-sm font-medium text-zinc-900">
                {new Date(poll.endsAt).toLocaleString()}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-sm text-zinc-500">Tokens</dt>
            <dd className="text-sm font-medium text-zinc-900">{poll._count.tokens}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-zinc-500">Ballots</dt>
            <dd className="text-sm font-medium text-zinc-900">{poll._count.ballots}</dd>
          </div>
        </dl>
      </div>

      {userCanManage && (
        <div className="mt-8 space-y-6">
          <StatusControls slug={poll.slug} status={poll.status} />
          {poll.organizationId && poll.organization ? (
            <OrgPollDistributor slug={poll.slug} orgSlug={poll.organization.slug} />
          ) : (
            <PollDistributor slug={poll.slug} pollId={poll.id} />
          )}
          <TokenGenerator slug={poll.slug} />
          <VoterRollManager slug={poll.slug} />
        </div>
      )}

      <div className="mt-8 border-t border-zinc-200 pt-6">
        <Link
          href={`/polls/${poll.slug}/results`}
          className="inline-flex items-center gap-2 text-sm font-medium text-chicago-blue transition-colors hover:text-chicago-blue-dark"
        >
          View results
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
