'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  slug: string
  status: string
}

export default function StatusControls({ slug, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleTransition(next: string) {
    setLoading(true)
    setError('')

    const res = await fetch(`/api/polls/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to update status')
      setLoading(false)
      return
    }

    router.refresh()
  }

  if (status === 'draft') {
    return (
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-green-900">Ready to start voting?</p>
            <p className="mt-0.5 text-xs text-green-700">
              Opening the poll locks the voter roll and allows ballots to be cast.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleTransition('open')}
            disabled={loading}
            className="shrink-0 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700 hover:shadow-md disabled:opacity-50"
          >
            {loading ? 'Opening...' : 'Open voting'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  if (status === 'open') {
    return (
      <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-red-900">Close this poll?</p>
            <p className="mt-0.5 text-xs text-red-700">
              No new ballots will be accepted. Results will be visible publicly. This cannot be
              undone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleTransition('closed')}
            disabled={loading}
            className="shrink-0 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 hover:shadow-md disabled:opacity-50"
          >
            {loading ? 'Closing...' : 'Close voting'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  return null
}
