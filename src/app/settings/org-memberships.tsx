'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Membership {
  organizationId: string
  organizationName: string
  organizationSlug: string
  role: string
}

export default function OrgMemberships({ memberships: initial }: { memberships: Membership[] }) {
  const [memberships, setMemberships] = useState(initial)
  const [leaving, setLeaving] = useState<string | null>(null)
  const router = useRouter()

  async function handleLeave(slug: string) {
    if (!confirm('Are you sure you want to leave this organization?')) return

    setLeaving(slug)

    try {
      const res = await fetch(`/api/user/orgs/${slug}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setMemberships((prev) => prev.filter((m) => m.organizationSlug !== slug))
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({ error: 'Something went wrong' }))
        alert(data.error || 'Failed to leave organization')
      }
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setLeaving(null)
    }
  }

  if (memberships.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        You are not a member of any organizations.{' '}
        <Link href="/orgs/new" className="text-chicago-blue hover:text-chicago-blue-dark">
          Create one
        </Link>
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {memberships.map((m) => (
        <li
          key={m.organizationId}
          className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4"
        >
          <div className="min-w-0 flex-1">
            <Link
              href={`/org/${m.organizationSlug}`}
              className="text-sm font-medium text-zinc-900 hover:text-chicago-navy"
            >
              {m.organizationName}
            </Link>
            {m.role === 'admin' && (
              <span className="ml-2 inline-flex items-center rounded-full bg-chicago-blue/10 px-2 py-0.5 text-xs font-medium text-chicago-blue">
                Admin
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleLeave(m.organizationSlug)}
            disabled={leaving === m.organizationSlug}
            className="ml-4 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {leaving === m.organizationSlug ? 'Leaving...' : 'Leave'}
          </button>
        </li>
      ))}
    </ul>
  )
}
