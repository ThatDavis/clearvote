import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import MemberManager from './member-manager'

export default async function OrgPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      users: {
        select: { id: true, name: true, email: true },
        orderBy: { createdAt: 'asc' },
      },
      polls: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { _count: { select: { ballots: true } } },
      },
    },
  })

  if (!org) {
    notFound()
  }

  const isMember = session.user.organizationId === org.id

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">
          &larr; Dashboard
        </Link>
      </div>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{org.name}</h1>

      <div className="mt-8">
        <h2 className="text-sm font-medium">Members ({org.users.length})</h2>
        {isMember && <MemberManager slug={org.slug} users={org.users} />}
        {!isMember && (
          <ul className="mt-2 divide-y divide-zinc-200 rounded-md border border-zinc-200">
            {org.users.map((u) => (
              <li key={u.id} className="px-3 py-2 text-sm">
                <span className="font-medium">{u.name}</span>
                <span className="ml-2 text-zinc-500">{u.email}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {org.polls.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-medium">Recent polls</h2>
          <ul className="mt-2 divide-y divide-zinc-200 rounded-md border border-zinc-200">
            {org.polls.map((poll) => (
              <li key={poll.id}>
                <Link
                  href={`/polls/${poll.slug}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
                >
                  <span className="text-sm">{poll.title}</span>
                  <span className="text-xs text-zinc-400">
                    {poll._count.ballots} vote{poll._count.ballots !== 1 ? 's' : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
