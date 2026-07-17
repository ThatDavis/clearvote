import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { requireSystemAdmin } from '@/lib/api/guards'
import { prisma } from '@/lib/prisma'
import AdminUserList from './admin-user-list'

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const isAdmin = await requireSystemAdmin(session.user.id)
  if (!isAdmin) {
    redirect('/dashboard')
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      _count: {
        select: { memberships: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Serialize dates for client component props
  const serializedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    emailVerified: u.emailVerified?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
    _count: { memberships: u._count.memberships },
  }))

  return (
    <div className="w-full px-[10%] py-8">
      <h1 className="text-2xl font-bold tracking-tight text-chicago-navy">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {serializedUsers.length} user{serializedUsers.length !== 1 ? 's' : ''} registered
      </p>

      <AdminUserList users={serializedUsers} />
    </div>
  )
}
