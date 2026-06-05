'use client'

import { useState } from 'react'

interface User {
  id: string
  name: string
  email: string
}

interface Props {
  slug: string
  users: User[]
}

export default function MemberManager({ slug, users: initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

    const user = await res.json()
    setUsers([...users, user])
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

    setUsers(users.filter((u) => u.id !== userId))
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
        {users.map((u) => (
          <li key={u.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <div>
              <span className="font-medium">{u.name}</span>
              <span className="ml-2 text-zinc-500">{u.email}</span>
            </div>
            <button
              type="button"
              onClick={() => removeMember(u.id)}
              className="text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
