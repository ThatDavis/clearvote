'use client'

import { useState } from 'react'

interface Member {
  id: string
  user: {
    id: string
    name: string
    email: string
  }
  role: string
}

interface Invite {
  id: string
  email: string
}

interface Props {
  slug: string
  members: Member[]
  invites: Invite[]
}

export default function MemberManager({
  slug,
  members: initialMembers,
  invites: initialInvites,
}: Props) {
  const [members, setMembers] = useState(initialMembers)
  const [invites, setInvites] = useState(initialInvites)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendingId, setResendingId] = useState('')

  async function addMember(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch(`/api/orgs/${slug}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to add member')
      setLoading(false)
      return
    }

    const data = await res.json()
    if (data.invited) {
      setInvites([...invites, { id: data.id, email: data.email }])
      setEmail('')
      setLoading(false)
      return
    }

    setMembers([...members, data])
    setEmail('')
    setLoading(false)
  }

  async function removeMember(userId: string) {
    setError('')

    const res = await fetch(`/api/orgs/${slug}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to remove member')
      return
    }

    setMembers(members.filter((m) => m.user.id !== userId))
  }

  async function removeInvite(inviteId: string) {
    setError('')

    const res = await fetch(`/api/orgs/${slug}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to remove invite')
      return
    }

    setInvites(invites.filter((i) => i.id !== inviteId))
  }

  async function resendInvite(inviteId: string) {
    setError('')
    setResendingId(inviteId)

    const res = await fetch(`/api/orgs/${slug}/members/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId }),
    })

    setResendingId('')

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to resend invite')
      return
    }
  }

  async function updateRole(userId: string, role: string) {
    setError('')

    const res = await fetch(`/api/orgs/${slug}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to update role')
      return
    }

    setMembers(members.map((m) => (m.user.id === userId ? { ...m, role } : m)))
  }

  return (
    <div>
      <form onSubmit={addMember} className="mt-2 flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          required
          className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add'}
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <ul className="mt-3 divide-y divide-zinc-200 rounded-md border border-zinc-200">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{m.user.name}</span>
              <span className="text-zinc-500">{m.user.email}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  m.role === 'admin'
                    ? 'bg-chicago-blue/10 text-chicago-blue'
                    : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {m.role}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={m.role}
                onChange={(e) => updateRole(m.user.id, e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1 text-xs"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="button"
                onClick={() => removeMember(m.user.id)}
                className="text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
        {invites.map((i) => (
          <li key={i.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">{i.email}</span>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                Pending
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => resendInvite(i.id)}
                disabled={resendingId === i.id}
                className="text-sm text-chicago-blue hover:text-chicago-blue-dark disabled:opacity-50"
              >
                {resendingId === i.id ? 'Resending...' : 'Resend invite'}
              </button>
              <button
                type="button"
                onClick={() => removeInvite(i.id)}
                className="text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
