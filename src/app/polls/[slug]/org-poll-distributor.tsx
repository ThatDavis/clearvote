'use client'

import { useEffect, useState } from 'react'

interface Member {
  id: string
  name: string
  email: string
}

interface Props {
  slug: string
  orgSlug: string
}

export default function OrgPollDistributor({ slug, orgSlug }: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [distributeAll, setDistributeAll] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<{
    addedToRoll: string[]
    emailsSent: string[]
    errors: string[]
  } | null>(null)

  useEffect(() => {
    fetch(`/api/orgs/${orgSlug}/members`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMembers(data.map((m: { user: Member }) => m.user))
        }
      })
      .catch(() => {
        setError('Failed to load organization members')
      })
  }, [orgSlug])

  async function handleDistribute() {
    const memberIds = distributeAll
      ? members.map((m) => m.id)
      : Array.from(selectedMembers)

    if (memberIds.length === 0) {
      setError('Please select at least one member')
      return
    }

    setLoading(true)
    setResults(null)
    setError('')

    const res = await fetch(`/api/polls/${slug}/distribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Failed to distribute poll')
      setLoading(false)
      return
    }

    setResults(data)
    setLoading(false)
  }

  return (
    <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Distribute to members</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Add organization members to the voter roll for this poll.
      </p>

      <div className="mt-4 space-y-3">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="radio"
            checked={distributeAll}
            onChange={() => setDistributeAll(true)}
            className="h-4 w-4"
          />
          <span className="text-sm">All members ({members.length})</span>
        </label>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="radio"
            checked={!distributeAll}
            onChange={() => setDistributeAll(false)}
            className="h-4 w-4"
          />
          <span className="text-sm">Select members</span>
        </label>

        {!distributeAll && (
          <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 p-3">
            {members.map((member) => (
              <label key={member.id} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedMembers.has(member.id)}
                  onChange={() => {
                    const next = new Set(selectedMembers)
                    if (next.has(member.id)) next.delete(member.id)
                    else next.add(member.id)
                    setSelectedMembers(next)
                  }}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                <span className="text-sm">{member.name}</span>
                <span className="text-xs text-zinc-400">{member.email}</span>
              </label>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleDistribute}
          disabled={loading}
          className="rounded-lg bg-chicago-red px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-chicago-red-dark hover:shadow-md disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add to voter roll'}
        </button>
      </div>

      {results && (
        <div className="mt-4 space-y-2">
          {results.addedToRoll.length > 0 && (
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-sm font-medium text-green-800">
                Added to voter roll ({results.addedToRoll.length})
              </p>
            </div>
          )}

          {results.emailsSent.length > 0 && (
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-sm font-medium text-green-800">
                Notifications sent ({results.emailsSent.length})
              </p>
            </div>
          )}

          {results.errors.length > 0 && (
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">Errors ({results.errors.length})</p>
              {results.errors.map((error, i) => (
                <p key={i} className="text-xs text-red-600">{error}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
