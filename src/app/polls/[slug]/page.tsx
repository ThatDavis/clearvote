import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import StatusControls from './status-controls'
import TokenGenerator from './token-generator'

export default async function PollPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const poll = await prisma.poll.findUnique({
    where: { slug },
    include: {
      options: {
        orderBy: { order: 'asc' },
      },
      _count: {
        select: { ballots: true, tokens: true },
      },
    },
  })

  if (!poll) {
    notFound()
  }

  const statusLabel = {
    draft: 'Draft',
    open: 'Open',
    closed: 'Closed',
  }[poll.status]

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
          &larr; Home
        </Link>
        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
          {statusLabel}
        </span>
      </div>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{poll.title}</h1>

      {poll.description && <p className="mt-2 text-zinc-600">{poll.description}</p>}

      <div className="mt-8 rounded-lg border border-zinc-200 p-4">
        <h2 className="text-sm font-medium">Options</h2>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-sm">
          {poll.options.map((option) => (
            <li key={option.id}>{option.label}</li>
          ))}
        </ol>
      </div>

      <div className="mt-4 text-sm text-zinc-500">
        <p>
          {poll._count.tokens} token{poll._count.tokens !== 1 ? 's' : ''} generated
        </p>
        <p>
          {poll._count.ballots} ballot{poll._count.ballots !== 1 ? 's' : ''} cast
        </p>
      </div>

      <StatusControls slug={poll.slug} status={poll.status} />
      <TokenGenerator slug={poll.slug} />

      <div className="mt-8 border-t border-zinc-200 pt-6">
        <Link
          href={`/polls/${poll.slug}/results`}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          View results &rarr;
        </Link>
      </div>
    </div>
  )
}
