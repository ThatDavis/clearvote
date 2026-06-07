'use client'

import { useState } from 'react'

export default function VerifyPage() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<{
    found: boolean
    pollTitle?: string
    pollSlug?: string
    pollStatus?: string
    castAt?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function verify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    const res = await fetch(`/api/verify?code=${encodeURIComponent(code.trim())}`)

    if (!res.ok && res.status !== 404) {
      setError('Something went wrong. Try again.')
      setLoading(false)
      return
    }

    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Verify your vote</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Enter your receipt code to confirm your vote was counted.
      </p>

      <form onSubmit={verify} className="mt-6 flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Receipt code"
          className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Verify'}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {result && (
        <div
          className={`mt-6 rounded-lg border p-6 ${result.found ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
        >
          {result.found ? (
            <>
              <p className="text-lg font-medium text-green-800">Vote confirmed</p>
              <p className="mt-1 text-sm text-green-700">
                Your vote was counted in <strong>{result.pollTitle}</strong>.
              </p>
              <p className="mt-1 text-xs text-green-600">
                Cast at {result.castAt ? new Date(result.castAt).toLocaleString() : 'unknown'}
              </p>
              <p className="mt-1 text-xs text-green-600">Poll status: {result.pollStatus}</p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-red-800">Not found</p>
              <p className="mt-1 text-sm text-red-700">
                No vote found with that receipt code. Double-check the code and try again.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
