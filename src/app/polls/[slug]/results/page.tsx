import { notFound } from 'next/navigation'
import ResultsView from '@/components/results-view'
import { auditLog } from '@/lib/audit'
import { effectiveStatus } from '@/lib/election'
import { prisma } from '@/lib/prisma'
import { getMethod } from '@/lib/voting-methods'

export default async function ResultsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const poll = await prisma.poll.findUnique({
    where: { slug },
    include: {
      options: {
        orderBy: { order: 'asc' },
      },
      ballots: {
        select: { id: true, rankings: true },
      },
      election: true,
    },
  })

  if (!poll) {
    notFound()
  }

  // Log first results view
  const alreadyViewed = await prisma.auditLog.findFirst({
    where: { pollId: poll.id, action: 'results_viewed' },
  })
  if (!alreadyViewed) {
    await auditLog({
      pollId: poll.id,
      action: 'results_viewed',
    })
  }

  const method = poll.votingMethod as string
  const status = effectiveStatus(poll)
  const statusLabel = { draft: 'Draft', open: 'Open', closed: 'Closed' }[status]
  const ballotCount = poll.ballots.length
  const methodDef = getMethod(method)

  return (
    <div className="w-full px-[10%] py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{poll.title}</h1>
      {poll.description && <p className="mt-2 text-zinc-600">{poll.description}</p>}

      <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500">
        <span>{statusLabel}</span>
        <span>{methodDef.label}</span>
        {methodDef.uses.threshold && <span>{poll.threshold}% threshold</span>}
        {methodDef.uses.seats && <span>{poll.seats} seats</span>}
        <span>
          {ballotCount} vote{ballotCount !== 1 ? 's' : ''} cast
        </span>
      </div>

      <div className="mt-8">
        <ResultsView
          method={method}
          options={poll.options}
          ballots={poll.ballots}
          cfg={{ seats: poll.seats, threshold: poll.threshold }}
          showBallots={status === 'closed'}
          shuffleSeed={poll.id}
        />
      </div>
    </div>
  )
}
