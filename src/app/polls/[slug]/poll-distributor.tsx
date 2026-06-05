'use client'

import { useEffect, useState } from 'react'
import VoterRollList from './voter-roll-manager'

interface Voter {
  id: string
  userId: string
  user: { id: string; name: string; email: string }
}

interface Props {
  slug: string
  locked?: boolean
}

export default function PollDistributor({ slug, locked }: Props) {
  const [emailInput, setEmailInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<{
    addedToRoll: string[]
    tokensGenerated: { email: string; token: string }[]
    emailsSent: string[]
    errors: string[]
  } | null>(null)
  const [voters, setVoters] = useState<Voter[]>([])

  useEffect(() => {
    fetch(`/api/polls/${slug}/roll`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setVoters(data)
      })
  }, [slug])

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

    // Refresh the voter roll
    fetch(`/api/polls/${slug}/roll`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setVoters(d) })
  }

  async function handleRemove(userId: string) {
    const res = await fetch(`/api/polls/${slug}/roll`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    if (res.ok) {
      setVoters(voters.filter((v) => v.userId !== userId))
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Voter roll</h2>
      <p className="mt-1 text-sm text-zinc-500">
        {locked
          ? 'The voter roll is locked while the poll is open.'
          : 'Enter email addresses to invite voters. Existing users are added to the roll directly. New users receive a voting link by email.'}
      </p>

      {!locked && (
        <>
          {error && (
            <div className="mt-3 rounded-lg bg-red-50 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="mt-4 space-y-3">
            <textarea
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
              rows={2}
              className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm shadow-sm transition-colors hover:border-zinc-400 focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
            />
            <p className="text-xs text-zinc-400">Separate multiple emails with commas</p>
            <button
              type="button"
              onClick={handleDistribute}
              disabled={loading}
              className="rounded-lg bg-chicago-red px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-chicago-red-dark hover:shadow-md disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add voters'}
            </button>
          </div>

          {results && (
            <div className="mt-4 space-y-2">
              {results.addedToRoll.length > 0 && (
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="text-sm font-medium text-green-800">
                    Added to roll ({results.addedToRoll.length})
                  </p>
                </div>
              )}
              {results.tokensGenerated.length > 0 && (
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-sm font-medium text-blue-800">
                    Invite links sent ({results.tokensGenerated.length})
                  </p>
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
                  <p className="text-sm font-medium text-red-800">
                    Errors ({results.errors.length})
                  </p>
                  {results.errors.map((e) => (
                    <p key={e} className="text-xs text-red-600">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="mt-4">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
          Current roll ({voters.length})
        </p>
        <VoterRollList voters={voters} onRemove={handleRemove} locked={locked} />
      </div>
    </div>
  )
}
