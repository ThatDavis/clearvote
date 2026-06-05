import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import VoteForm from './vote-form'

export default async function VotePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { slug } = await params
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="mx-auto max-w-lg px-6 py-32 text-center">
        <h1 className="text-xl font-semibold">Missing token</h1>
        <p className="mt-2 text-zinc-600">You need a valid voting link to access this page.</p>
      </div>
    )
  }

  const poll = await prisma.poll.findUnique({
    where: { slug },
    include: {
      options: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!poll) {
    notFound()
  }

  if (poll.status !== 'open') {
    return (
      <div className="mx-auto max-w-lg px-6 py-32 text-center">
        <h1 className="text-xl font-semibold">Voting is {poll.status}</h1>
        <p className="mt-2 text-zinc-600">
          {poll.status === 'draft' ? 'This poll has not opened yet.' : 'This poll has closed.'}
        </p>
      </div>
    )
  }

  const voterToken = await prisma.voterToken.findUnique({
    where: {
      pollId_token: {
        pollId: poll.id,
        token,
      },
    },
  })

  if (!voterToken) {
    return (
      <div className="mx-auto max-w-lg px-6 py-32 text-center">
        <h1 className="text-xl font-semibold">Invalid token</h1>
        <p className="mt-2 text-zinc-600">This voting link is not valid.</p>
      </div>
    )
  }

  if (voterToken.usedAt) {
    return (
      <div className="mx-auto max-w-lg px-6 py-32 text-center">
        <h1 className="text-xl font-semibold">Already voted</h1>
        <p className="mt-2 text-zinc-600">This token has already been used.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{poll.title}</h1>
      {poll.description && <p className="mt-2 text-zinc-600">{poll.description}</p>}

      <p className="mt-6 text-sm text-zinc-500">
        Drag the options to rank them in order of preference. Your first choice goes at the top.
      </p>

      <VoteForm
        pollSlug={poll.slug}
        token={token}
        options={poll.options.map((o) => ({ id: o.id, label: o.label }))}
      />
    </div>
  )
}
