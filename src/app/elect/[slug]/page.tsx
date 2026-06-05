import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/token'
import ElectionBallot from './election-ballot'

export default async function ElectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { slug } = await params
  const { token } = await searchParams
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
        },
      },
    },
  })

  if (!election) {
    notFound()
  }

  // Auto-close if past end date
  if (election.status === 'open' && election.endsAt && new Date(election.endsAt) < new Date()) {
    await prisma.election.update({
      where: { id: election.id },
      data: { status: 'closed' },
    })
    election.status = 'closed'
  }

  if (election.status !== 'open') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <h1 className="text-xl font-semibold">Voting is {election.status}</h1>
        <p className="mt-2 text-zinc-600">
          {election.status === 'draft'
            ? 'This election has not opened yet.'
            : 'This election has closed.'}
        </p>
      </div>
    )
  }

  let credentialType: 'token' | 'session' | null = null

  if (token) {
    const tokenHash = hashToken(token)
    const voterToken = await prisma.electionVoterToken.findUnique({
      where: {
        electionId_tokenHash: {
          electionId: election.id,
          tokenHash,
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

    credentialType = 'token'
  } else if (session?.user?.id) {
    const onRoll = await prisma.electionVoterRoll.findUnique({
      where: {
        electionId_userId: {
          electionId: election.id,
          userId: session.user.id,
        },
      },
    })

    if (!onRoll) {
      return (
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
          <h1 className="text-xl font-semibold">Not eligible</h1>
          <p className="mt-2 text-zinc-600">You are not on the voter roll for this election.</p>
        </div>
      )
    }

    if (onRoll.hasVoted) {
      return (
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
          <h1 className="text-xl font-semibold">Already voted</h1>
          <p className="mt-2 text-zinc-600">You have already cast a vote in this election.</p>
        </div>
      )
    }

    credentialType = 'session'
  } else {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <h1 className="text-xl font-semibold">Authentication required</h1>
        <p className="mt-2 text-zinc-600">
          This election requires authentication. Please log in to vote.
        </p>
      </div>
    )
  }

  return (
    <ElectionBallot
      election={election}
      contests={election.contests}
      token={token ?? null}
      credentialType={credentialType}
    />
  )
}
