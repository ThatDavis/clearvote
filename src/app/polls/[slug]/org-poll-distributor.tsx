'use client'

import { useEffect, useState } from 'react'
import VoterRollList from './voter-roll-manager'

interface Member {
  id: string
  name: string
  email: string
}

interface Voter {
  id: string
  userId: string
  user: { id: string; name: string; email: string }
}

interface Props {
  slug: string
  orgSlug: string
  locked?: boolean
}

export default function OrgPollDistributor({ slug, orgSlug, locked }: Props) {
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
  const [voters, setVoters] = useState<Voter[]>([])

  useEffect(() => {
    fetch(`/api/orgs/${orgSlug}/members`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMembers(data.map((m: { user: Member }) => m.user))
        }
      })
      .catch(() => setError('Failed to load organization members'))

    fetch(`/api/polls/${slug}/roll`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setVoters(data) })
  }, [orgSlug, slug])

  async function handleDistribute() {
    const memberIds = distributeAll ? members.map((m) => m.id) : Array.from(selectedMembers)

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
          : 'Add organization members to the voter roll for this poll.'}
      </p>

      {!locked && (
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
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 p-3">
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

          {results && (
            <div className="space-y-2">
              {results.addedToRoll.length > 0 && (
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="text-sm font-medium text-green-800">
                    Added to roll ({results.addedToRoll.length})
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
        </div>
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
