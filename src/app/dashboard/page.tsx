import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const myPolls = await prisma.poll.findMany({
    where: { creatorId: session.user.id },
    include: {
      _count: { select: { ballots: true, tokens: true } },
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

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Draft',
      open: 'Open',
      closed: 'Closed',
    }
    return labels[status] || status
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      <div className="mt-10">
        <h2 className="text-lg font-medium">My polls</h2>
        {myPolls.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            You haven&apos;t created any polls yet.{' '}
            <Link href="/polls/new" className="text-zinc-900 hover:underline">
              Create one
            </Link>
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {myPolls.map((poll) => (
              <li key={poll.id}>
                <Link
                  href={`/polls/${poll.slug}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
                >
                  <div>
                    <span className="text-sm font-medium">{poll.title}</span>
                    <span className="ml-2 text-xs text-zinc-500">{statusLabel(poll.status)}</span>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {poll._count.ballots} vote{poll._count.ballots !== 1 ? 's' : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canVote.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-medium">Polls you can vote on</h2>
          <ul className="mt-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {canVote.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/vote/${entry.poll.slug}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
                >
                  <span className="text-sm font-medium">{entry.poll.title}</span>
                  <span className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white">
                    Vote
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasVoted.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-medium">Voted</h2>
          <ul className="mt-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {hasVoted.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/polls/${entry.poll.slug}/results`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
                >
                  <div>
                    <span className="text-sm font-medium">{entry.poll.title}</span>
                    <span className="ml-2 text-xs text-zinc-500">
                      {statusLabel(entry.poll.status)}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400">View results &rarr;</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
