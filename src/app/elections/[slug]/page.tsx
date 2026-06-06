import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ELECTION_CONFIG } from '@/lib/entity-config'
import AuditTrail from '@/components/manage/audit-trail'
import ContestManager from './contest-manager'
import DeleteElectionButton from './delete-election-button'
import ElectionDistributor from './election-distributor'
import ElectionEditor from './election-editor'
import OrgElectionDistributor from './org-election-distributor'
import ElectionStatusControls from './status-controls'
import ElectionTokenGenerator from './token-generator'

export default async function ElectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const election = await prisma.election.findUnique({
    where: { slug },
    include: {
      contests: {
        orderBy: { contestOrder: 'asc' },
        include: {
          options: {
            orderBy: { order: 'asc' },
          },
          _count: {
            select: { ballots: true },
          },
        },
      },
      organization: {
        select: { slug: true },
      },
      _count: {
        select: { contests: true, tokens: true, rolls: true, receipts: true },
      },
    },
  })

  if (!election) {
    notFound()
  }

  let userCanManage = false
  if (session?.user?.id && election.creatorId) {
    if (session.user.id === election.creatorId) {
      userCanManage = true
    } else if (election.organizationId) {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: session.user.id,
            organizationId: election.organizationId,
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

  const status = statusConfig[election.status]
  const locked = election.status !== 'draft'

  return (
    <div className="w-full px-[10%] py-8">
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
          {status?.label || election.status}
        </span>
      </div>

      <div className="mt-6">
        <ElectionEditor
          slug={slug}
          initialTitle={election.title}
          initialDescription={election.description}
          canManage={userCanManage}
          isDraft={!locked}
        />
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/50 p-5">
        <h3 className="text-sm font-semibold text-zinc-900">Election details</h3>
        <dl className="mt-3 space-y-2">
          {election.startsAt && (
            <div className="flex justify-between">
              <dt className="text-sm text-zinc-500">Starts</dt>
              <dd className="text-sm font-medium text-zinc-900">
                {new Date(election.startsAt).toLocaleString()}
              </dd>
            </div>
          )}
          {election.endsAt && (
            <div className="flex justify-between">
              <dt className="text-sm text-zinc-500">Ends</dt>
              <dd className="text-sm font-medium text-zinc-900">
                {new Date(election.endsAt).toLocaleString()}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-sm text-zinc-500">Contests</dt>
            <dd className="text-sm font-medium text-zinc-900">{election._count.contests}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-zinc-500">Voter tokens</dt>
            <dd className="text-sm font-medium text-zinc-900">{election._count.tokens}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-zinc-500">Voter roll</dt>
            <dd className="text-sm font-medium text-zinc-900">{election._count.rolls}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-zinc-500">Ballots cast</dt>
            <dd className="text-sm font-medium text-zinc-900">{election._count.receipts}</dd>
          </div>
        </dl>
      </div>

      {userCanManage && (
        <>
          <div className="mt-8">
            <ContestManager electionSlug={slug} contests={election.contests} locked={locked} />
          </div>

          <div className="mt-8 space-y-4">
            {election.organizationId && election.organization ? (
              <OrgElectionDistributor
                slug={slug}
                orgSlug={election.organization.slug}
                locked={locked}
              />
            ) : (
              <ElectionDistributor slug={slug} locked={locked} />
            )}
            <ElectionTokenGenerator slug={slug} locked={locked} />
            <ElectionStatusControls slug={slug} status={election.status} />
            <AuditTrail entity={ELECTION_CONFIG} slug={slug} />
            {election.status === 'draft' && (
              <DeleteElectionButton slug={slug} title={election.title} />
            )}
          </div>
        </>
      )}

      {!userCanManage && election.contests.length > 0 && (
        <div className="mt-8 rounded-xl border-2 border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Contests</h2>
          <ol className="mt-3 space-y-4">
            {election.contests.map((contest, i) => (
              <li key={contest.id} className="text-sm">
                <div className="font-medium">
                  {i + 1}. {contest.title}
                </div>
                <div className="mt-1 text-zinc-500">
                  {contest.votingMethod === 'stv' && `STV (${contest.seats} seats)`}
                  {contest.votingMethod === 'approval' && 'Approval'}
                  {contest.votingMethod === 'yesno' && `Yes/No (${contest.threshold}% threshold)`}
                  {contest.votingMethod === 'rcv' && 'Ranked Choice'}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-8 border-t border-zinc-200 pt-6">
        <Link
          href={`/elections/${election.slug}/results`}
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
