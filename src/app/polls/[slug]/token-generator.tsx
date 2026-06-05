'use client'

import { useEffect, useState } from 'react'

interface GeneratedToken {
  id: string
  token: string
}

interface Props {
  slug: string
  locked?: boolean
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium transition-all ${
        copied ? 'bg-green-100 text-green-700' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
      }`}
    >
      {copied ? (
        <span className="flex items-center gap-1">
          <svg aria-hidden="true" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <svg aria-hidden="true" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </span>
      )}
    </button>
  )
}

export default function TokenGenerator({ slug, locked }: Props) {
  const [count, setCount] = useState(10)
  const [loading, setLoading] = useState(false)
  const [tokens, setTokens] = useState<GeneratedToken[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/polls/${slug}/tokens`)
      .then((res) => res.json())
      .then((data) => {
        if (data.tokens) setTokens(data.tokens)
      })
  }, [slug])

  async function generate() {
    setLoading(true)
    setError('')

    const res = await fetch(`/api/polls/${slug}/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to generate tokens')
      setLoading(false)
      return
    }

    const data = await res.json()
    setTokens((prev) => [...prev, ...data.tokens])
    setLoading(false)
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Anonymous voting links</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Generate one-time links for voters without accounts. Share however you like — print, email, or hand out at a meeting. Each link can only be used once.
      </p>

      {!locked && (
        <div className="mt-4 flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={500}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-24 rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
          />
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {loading ? 'Generating...' : tokens.length === 0 ? 'Generate' : 'Add tokens'}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {tokens.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            {tokens.length} link{tokens.length !== 1 ? 's' : ''} total
          </p>
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs">
            {tokens.map((t) => {
              const link = `${origin}/vote/${slug}?token=${t.token}`
              return (
                <li key={t.id} className="flex items-center gap-2">
                  <code className="flex-1 truncate text-zinc-600">{link}</code>
                  <CopyButton text={link} />
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
