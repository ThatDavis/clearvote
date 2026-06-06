'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  slug: string
  title: string
}

export default function DeleteElectionButton({ slug, title }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setLoading(true)
    setError('')

    const res = await fetch(`/api/elections/${slug}`, { method: 'DELETE' })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to delete election')
      setLoading(false)
      return
    }

    router.refresh()
  }

  if (confirming) {
    return (
      <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6">
        <p className="text-sm font-semibold text-red-900">Delete "{title}"?</p>
        <p className="mt-0.5 text-xs text-red-700">
          This will permanently remove the election, all contests, and all associated data. This
          cannot be undone.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 shadow-sm transition-all hover:bg-red-50"
    >
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
      Delete election
    </button>
  )
}
