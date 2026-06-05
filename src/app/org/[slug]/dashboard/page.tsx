import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import OrgDashboardClient from './org-dashboard-client'

export default async function OrgDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      members: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  })

  if (!org) {
    notFound()
  }

  if (org.members.length === 0) {
    redirect('/dashboard')
  }

  const isAdmin = org.members[0]?.role === 'admin'

  const polls = await prisma.poll.findMany({
    where: { organizationId: org.id, electionId: null },
    include: {
      _count: { select: { ballots: true, tokens: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const elections = await prisma.election.findMany({
    where: { organizationId: org.id },
    include: {
      contests: { select: { id: true } },
      _count: { select: { receipts: true, tokens: true, rolls: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <Suspense>
      <OrgDashboardClient
        org={{ id: org.id, name: org.name, slug: org.slug }}
        isAdmin={isAdmin}
        polls={polls}
        elections={elections}
      />
    </Suspense>
  )
}
