import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import NameEditor from './name-editor'
import OrgMemberships from './org-memberships'
import PasswordEditor from './password-editor'
import SettingsClient from './settings-client'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
    },
  })

  if (!user) {
    redirect('/login')
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const orgs = memberships.map((m) => ({
    organizationId: m.organization.id,
    organizationName: m.organization.name,
    organizationSlug: m.organization.slug,
    role: m.role,
  }))

  return (
    <div className="w-full px-[10%] py-8">
      <h1 className="text-2xl font-bold tracking-tight text-chicago-navy">Settings</h1>
      <p className="mt-1 text-sm text-zinc-500">Manage your account</p>

      <div className="mt-8 max-w-xl space-y-6">
        {/* Profile Section */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Profile</h2>
          <dl className="mt-4 space-y-4">
            <div>
              <dt className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Name</dt>
              <dd className="mt-1">
                <NameEditor initialName={user.name} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Email</dt>
              <dd className="mt-1 flex items-center gap-2 text-sm text-zinc-900">
                {user.email}
                {user.emailVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                    <svg
                      aria-hidden="true"
                      className="h-3 w-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    <svg
                      aria-hidden="true"
                      className="h-3 w-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Not verified
                  </span>
                )}
              </dd>
            </div>
          </dl>

          {!user.emailVerified && (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
              <p className="text-sm text-amber-800">
                Your email is not verified. You need a verified email to be added to voter rolls.
              </p>
              <div className="mt-3">
                <SettingsClient email={user.email} />
              </div>
            </div>
          )}
        </section>

        {/* Security Section */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Security</h2>
          <div className="mt-4">
            <PasswordEditor />
          </div>
        </section>

        {/* Organizations Section */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Organizations</h2>
          <div className="mt-4">
            <OrgMemberships memberships={orgs} />
          </div>
        </section>
      </div>
    </div>
  )
}
