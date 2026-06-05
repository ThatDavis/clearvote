'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  slug: string
  status: string
}

const transitions: Record<string, { label: string; next: string }> = {
  draft: { label: 'Open voting', next: 'open' },
  open: { label: 'Close voting', next: 'closed' },
}

export default function StatusControls({ slug, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const transition = transitions[status]
  if (!transition) return null

  async function handleTransition() {
    setLoading(true)
    setError('')

    const res = await fetch(`/api/polls/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: transition.next }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to update status')
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={handleTransition}
        disabled={loading}
        className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {loading ? 'Updating...' : transition.label}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
