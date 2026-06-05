'use client'

import { useState } from 'react'

interface Props {
  slug: string
  organizationId?: string | null
}

export default function PollDistributor({ slug, organizationId }: Props) {
  const [emailInput, setEmailInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<{
    addedToRoll: string[]
    tokensGenerated: { email: string; token: string }[]
    emailsSent: string[]
    errors: string[]
  } | null>(null)

  async function handleDistribute() {
    const emails = emailInput
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)

    if (emails.length === 0) {
      setError('Please enter at least one email')
      return
    }

    setLoading(true)
    setResults(null)
    setError('')

    const res = await fetch(`/api/polls/${slug}/distribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Failed to distribute poll')
      setLoading(false)
      return
    }

    setResults(data)
    setEmailInput('')
    setLoading(false)
  }

  return (
    <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Distribute poll</h2>
      <p className="mt-1 text-sm text-zinc-500">
        {organizationId
          ? 'Add organization members to the voter roll.'
          : 'Enter email addresses to invite voters. Existing users will be added to the voter roll. New users will receive a voting link via email.'}
      </p>

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="mt-4 space-y-3">
        <textarea
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          placeholder="email1@example.com, email2@example.com, email3@example.com"
          rows={3}
          className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm shadow-sm transition-colors hover:border-zinc-400 focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
        />
        <p className="text-xs text-zinc-400">Separate multiple emails with commas</p>

        <button
          type="button"
          onClick={handleDistribute}
          disabled={loading}
          className="rounded-lg bg-chicago-red px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-chicago-red-dark hover:shadow-md disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send invitations'}
        </button>
      </div>

      {results && (
        <div className="mt-4 space-y-2">
          {results.addedToRoll.length > 0 && (
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-sm font-medium text-green-800">
                Added to voter roll ({results.addedToRoll.length})
              </p>
              <p className="text-xs text-green-600 mt-1">{results.addedToRoll.join(', ')}</p>
            </div>
          )}

          {results.tokensGenerated.length > 0 && (
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-sm font-medium text-blue-800">
                Generated voting links ({results.tokensGenerated.length})
              </p>
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {results.tokensGenerated.map(({ email, token }) => (
                  <div key={token} className="flex items-center gap-2 text-xs">
                    <span className="text-blue-700">{email}</span>
                    <code className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-800">
                      {token.slice(0, 8)}...
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.emailsSent.length > 0 && (
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-sm font-medium text-green-800">
                Emails sent ({results.emailsSent.length})
              </p>
            </div>
          )}

          {results.errors.length > 0 && (
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">Errors ({results.errors.length})</p>
              {results.errors.map((error) => (
                <p key={error} className="text-xs text-red-600">
                  {error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
