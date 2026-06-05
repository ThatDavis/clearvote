import { notFound } from 'next/navigation'
import { auth } from '@/auth'
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
  const session = await auth()

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
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <h1 className="text-xl font-semibold">Voting is {poll.status}</h1>
        <p className="mt-2 text-zinc-600">
          {poll.status === 'draft' ? 'This poll has not opened yet.' : 'This poll has closed.'}
        </p>
      </div>
    )
  }

  if (token) {
    // Token-based anonymous voting
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
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
          <h1 className="text-xl font-semibold">Invalid token</h1>
          <p className="mt-2 text-zinc-600">This voting link is not valid.</p>
        </div>
      )
    }

    if (voterToken.usedAt) {
      return (
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
          <h1 className="text-xl font-semibold">Already voted</h1>
          <p className="mt-2 text-zinc-600">This token has already been used.</p>
        </div>
      )
    }
  } else if (session?.user?.id) {
    // Authenticated voting — check voter roll
    const onRoll = await prisma.voterRoll.findUnique({
      where: {
        pollId_userId: {
          pollId: poll.id,
          userId: session.user.id,
        },
      },
    })

    if (!onRoll) {
      return (
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
          <h1 className="text-xl font-semibold">Not eligible</h1>
          <p className="mt-2 text-zinc-600">You are not on the voter roll for this poll.</p>
        </div>
      )
    }

    if (onRoll.hasVoted) {
      return (
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
          <h1 className="text-xl font-semibold">Already voted</h1>
          <p className="mt-2 text-zinc-600">You have already cast a vote in this poll.</p>
        </div>
      )
    }
  } else {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <h1 className="text-xl font-semibold">Authentication required</h1>
        <p className="mt-2 text-zinc-600">
          This poll requires authentication. Please log in to vote.
        </p>
      </div>
    )
  }

  const instructions: Record<string, string> = {
    rcv: 'Drag the options to rank them in order of preference. Your first choice goes at the top.',
    stv: `Drag the options to rank them in order of preference. ${poll.seats} winner${poll.seats !== 1 ? 's' : ''} will be elected.`,
    approval: 'Check all options you approve of.',
    yesno: 'Vote yes or no on each option.',
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{poll.title}</h1>
      {poll.description && <p className="mt-2 text-zinc-600">{poll.description}</p>}

      <p className="mt-6 text-sm text-zinc-500">
        {instructions[poll.votingMethod] || instructions.rcv}
      </p>

      <VoteForm
        pollSlug={poll.slug}
        token={token ?? null}
        options={poll.options.map((o) => ({ id: o.id, label: o.label }))}
        votingMethod={poll.votingMethod as string}
      />
    </div>
  )
}
