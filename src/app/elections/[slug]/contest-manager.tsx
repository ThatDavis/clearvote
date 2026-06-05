'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Contest {
  id: string
  title: string
  description: string | null
  votingMethod: string
  seats: number
  threshold: number
  contestOrder: number
  options: { id: string; label: string }[]
}

export default function ContestManager({
  electionSlug,
  contests,
  locked,
}: {
  electionSlug: string
  contests: Contest[]
  locked: boolean
}) {
  const router = useRouter()
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Add contest form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [votingMethod, setVotingMethod] = useState('rcv')
  const [seats, setSeats] = useState(1)
  const [threshold, setThreshold] = useState(50)
  const [optionsText, setOptionsText] = useState('')

  async function handleAddContest(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const options = optionsText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    try {
      const res = await fetch(`/api/elections/${electionSlug}/contests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          votingMethod,
          seats: votingMethod === 'stv' ? seats : undefined,
          threshold: votingMethod === 'yesno' ? threshold : undefined,
          options,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add contest')
      }

      setShowAddForm(false)
      setTitle('')
      setDescription('')
      setVotingMethod('rcv')
      setSeats(1)
      setThreshold(50)
      setOptionsText('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteContest(contestId: string) {
    if (!confirm('Are you sure you want to remove this contest?')) return

    setLoading(true)
    try {
      const res = await fetch(`/api/elections/${electionSlug}/contests`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contestId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete contest')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleMoveContest(contestId: string, direction: 'up' | 'down') {
    const currentIndex = contests.findIndex((c) => c.id === contestId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= contests.length) return

    const newOrders = contests.map((c, i) => ({
      contestId: c.id,
      order: i === currentIndex ? newIndex : i === newIndex ? currentIndex : i,
    }))

    setLoading(true)
    try {
      const res = await fetch(`/api/elections/${electionSlug}/contests`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contestOrders: newOrders }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reorder contests')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const methodLabel: Record<string, string> = {
    rcv: 'Ranked Choice',
    stv: 'STV',
    approval: 'Approval',
    yesno: 'Yes/No',
  }

  return (
    <div className="rounded-xl border-2 border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Contests</h2>

      {contests.length === 0 && !locked && (
        <p className="mt-2 text-sm text-zinc-500">No contests yet. Add your first contest below.</p>
      )}

      <ol className="mt-3 space-y-3">
        {contests.map((contest, i) => (
          <li
            key={contest.id}
            className="flex items-start justify-between rounded-lg border border-zinc-200 p-3"
          >
            <div>
              <div className="font-medium">
                {i + 1}. {contest.title}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                {methodLabel[contest.votingMethod] || contest.votingMethod}
                {contest.votingMethod === 'stv' && ` (${contest.seats} seats)`}
                {contest.votingMethod === 'yesno' && ` (${contest.threshold}% threshold)`}
                {' · '}
                {contest.options.length} option{contest.options.length !== 1 ? 's' : ''}
              </div>
            </div>

            {!locked && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveContest(contest.id, 'up')}
                  disabled={i === 0 || loading}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-30"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveContest(contest.id, 'down')}
                  disabled={i === contests.length - 1 || loading}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-30"
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteContest(contest.id)}
                  disabled={loading}
                  className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>

      {!locked && !showAddForm && (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="mt-4 inline-flex items-center rounded-md bg-chicago-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-chicago-blue/90"
        >
          + Add contest
        </button>
      )}

      {showAddForm && (
        <form
          onSubmit={handleAddContest}
          className="mt-4 space-y-4 rounded-lg border border-zinc-200 p-4"
        >
          <h3 className="text-sm font-semibold">New contest</h3>

          <div>
            <label htmlFor="contest-title" className="block text-xs font-medium text-zinc-700">
              Title
            </label>
            <input
              id="contest-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="contest-description"
              className="block text-xs font-medium text-zinc-700"
            >
              Description
            </label>
            <textarea
              id="contest-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="contest-method" className="block text-xs font-medium text-zinc-700">
                Method
              </label>
              <select
                id="contest-method"
                value={votingMethod}
                onChange={(e) => setVotingMethod(e.target.value)}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="rcv">Ranked Choice</option>
                <option value="stv">STV</option>
                <option value="approval">Approval</option>
                <option value="yesno">Yes/No</option>
              </select>
            </div>

            {votingMethod === 'stv' && (
              <div>
                <label htmlFor="contest-seats" className="block text-xs font-medium text-zinc-700">
                  Seats
                </label>
                <input
                  id="contest-seats"
                  type="number"
                  min={1}
                  value={seats}
                  onChange={(e) => setSeats(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
            )}

            {votingMethod === 'yesno' && (
              <div>
                <label
                  htmlFor="contest-threshold"
                  className="block text-xs font-medium text-zinc-700"
                >
                  Threshold (%)
                </label>
                <input
                  id="contest-threshold"
                  type="number"
                  min={1}
                  max={100}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="contest-options" className="block text-xs font-medium text-zinc-700">
              Options (one per line)
            </label>
            <textarea
              id="contest-options"
              rows={4}
              required
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              placeholder="Option 1&#10;Option 2&#10;Option 3"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-chicago-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-chicago-navy/90 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add contest'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
