'use client'

import { useState } from 'react'

interface Voter {
  id: string
  userId: string
  user: {
    id: string
    name: string
    email: string
  }
}

interface Props {
  slug: string
}

export default function VoterRollManager({ slug }: Props) {
  const [voters, setVoters] = useState<Voter[]>([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  async function loadVoters() {
    const res = await fetch(`/api/polls/${slug}/roll`)
    if (res.ok) {
      const data = await res.json()
      setVoters(data)
    }
    setLoaded(true)
  }

  if (!loaded) {
    loadVoters()
  }

  async function addVoter(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch(`/api/polls/${slug}/roll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to add voter')
      setLoading(false)
      return
    }

    const voter = await res.json()
    setVoters([...voters, voter])
    setEmail('')
    setLoading(false)
  }

  async function removeVoter(userId: string) {
    setError('')

    const res = await fetch(`/api/polls/${slug}/roll`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to remove voter')
      return
    }

    setVoters(voters.filter((v) => v.userId !== userId))
  }

  return (
    <div className="mt-8">
      <h2 className="text-sm font-medium">Voter roll</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Add users who are eligible to vote. They must have an account.
      </p>

      <form onSubmit={addVoter} className="mt-3 flex gap-2">
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

      {voters.length > 0 && (
        <ul className="mt-3 divide-y divide-zinc-200 rounded-md border border-zinc-200">
          {voters.map((v) => (
            <li key={v.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>
                <span className="font-medium">{v.user.name}</span>
                <span className="ml-2 text-zinc-500">{v.user.email}</span>
              </div>
              <button
                type="button"
                onClick={() => removeVoter(v.userId)}
                className="text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
