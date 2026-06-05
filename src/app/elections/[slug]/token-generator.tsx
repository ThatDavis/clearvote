'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  slug: string
  locked: boolean
}

export default function ElectionTokenGenerator({ slug, locked }: Props) {
  const router = useRouter()
  const [count, setCount] = useState(10)
  const [loading, setLoading] = useState(false)
  const [tokens, setTokens] = useState<{ id: string; token: string }[]>([])
  const [error, setError] = useState('')

  async function handleGenerate() {
    setLoading(true)
    setError('')
    setTokens([])

    try {
      const res = await fetch(`/api/elections/${slug}/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate tokens')
      }

      const data = await res.json()
      setTokens(data.tokens)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-zinc-900">Anonymous tokens</h3>

      <div className="mt-3 flex items-center gap-3">
        <input
          type="number"
          min={1}
          max={500}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          disabled={locked || loading}
          className="w-20 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={locked || loading}
          className="rounded-md bg-chicago-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-chicago-navy/90 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {locked && (
        <p className="mt-2 text-xs text-zinc-500">
          Token generation is locked while election is open.
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {tokens.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-green-700">
            Tokens generated (copy now - they won't be shown again):
          </p>
          <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-green-200 bg-green-50 p-3">
            {tokens.map((t) => (
              <div key={t.id} className="font-mono text-xs text-green-900">
                {t.token}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
