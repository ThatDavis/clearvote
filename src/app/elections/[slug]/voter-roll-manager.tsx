'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface RollEntry {
  id: string
  user: {
    id: string
    name: string
    email: string
  }
  hasVoted: boolean
}

interface Props {
  slug: string
  locked: boolean
}

export default function ElectionVoterRollManager({ slug, locked }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [roll, setRoll] = useState<RollEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  async function loadRoll() {
    const res = await fetch(`/api/elections/${slug}/roll`)
    if (res.ok) {
      const data = await res.json()
      setRoll(data)
      setLoaded(true)
    }
  }

  async function handleAdd() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/elections/${slug}/roll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add voter')
      }

      setEmail('')
      await loadRoll()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm('Remove this voter from the roll?')) return

    setLoading(true)
    try {
      const res = await fetch(`/api/elections/${slug}/roll`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to remove voter')
      }

      await loadRoll()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-zinc-900">Voter roll</h3>

      {!locked && (
        <div className="mt-3 flex items-center gap-3">
          <input
            type="email"
            placeholder="voter@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={loading || !email.trim()}
            className="rounded-md bg-chicago-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-chicago-navy/90 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={loadRoll}
        disabled={loading}
        className="mt-3 text-xs text-zinc-500 hover:text-zinc-700"
      >
        {loaded ? 'Refresh voter roll' : 'Load voter roll'}
      </button>

      {loaded && roll.length > 0 && (
        <ul className="mt-3 divide-y divide-zinc-100">
          {roll.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between py-2">
              <div className="text-sm">
                <div>{entry.user.name || entry.user.email}</div>
                <div className="text-xs text-zinc-500">{entry.user.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {entry.hasVoted && <span className="text-xs text-green-600">Voted</span>}
                {!locked && (
                  <button
                    type="button"
                    onClick={() => handleRemove(entry.user.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {loaded && roll.length === 0 && (
        <p className="mt-2 text-sm text-zinc-500">No voters on the roll yet.</p>
      )}
    </div>
  )
}
