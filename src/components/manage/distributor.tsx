'use client'

import { useEffect, useState } from 'react'
import type { EntityConfig } from '@/lib/entity-config'
import VoterRollList from './voter-roll-list'

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
  entity: EntityConfig
  slug: string
  orgSlug?: string
  locked?: boolean
}

export default function Distributor({ entity, slug, orgSlug, locked }: Props) {
  const isOrg = !!orgSlug
  const [emailInput, setEmailInput] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [distributeAll, setDistributeAll] = useState(true)
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
    if (isOrg) {
      fetch(`/api/orgs/${orgSlug}/members`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setMembers(data.map((m: { user: Member }) => m.user))
          }
        })
        .catch(() => setError('Failed to load organization members'))
    }

    fetch(`${entity.apiBase(slug)}/roll`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setVoters(data)
      })
  }, [entity, slug, orgSlug, isOrg])

  async function handleDistribute() {
    let body: Record<string, unknown>

    if (isOrg) {
      const memberIds = distributeAll ? members.map((m) => m.id) : Array.from(selectedMembers)
      if (memberIds.length === 0) {
        setError('Please select at least one member')
        return
      }
      body = { memberIds }
    } else {
      const emails = emailInput
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean)
      if (emails.length === 0) {
        setError('Please enter at least one email')
        return
      }
      body = { emails }
    }

    setLoading(true)
    setResults(null)
    setError('')

    const res = await fetch(`${entity.apiBase(slug)}/distribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || `Failed to distribute ${entity.noun}`)
      setLoading(false)
      return
    }

    setResults(data)
    if (!isOrg) setEmailInput('')
    setLoading(false)

    fetch(`${entity.apiBase(slug)}/roll`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setVoters(d)
      })
  }

  async function handleRemove(userId: string) {
    const res = await fetch(`${entity.apiBase(slug)}/roll`, {
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
          ? `The voter roll is locked while the ${entity.noun} is open.`
          : isOrg
            ? `Add organization members to the voter roll for this ${entity.noun}.`
            : 'Enter email addresses to invite voters. Existing users are added to the roll directly. New users receive a voting link by email.'}
      </p>

      {!locked && (
        <>
          {isOrg ? (
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
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <textarea
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="email1@example.com, email2@example.com"
                rows={2}
                className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm shadow-sm transition-colors hover:border-zinc-400 focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
              />
              <p className="text-xs text-zinc-400">Separate multiple emails with commas</p>
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-lg bg-red-50 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleDistribute}
            disabled={loading}
            className="mt-3 rounded-lg bg-chicago-red px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-chicago-red-dark hover:shadow-md disabled:opacity-50"
          >
            {loading ? 'Adding...' : isOrg ? 'Add to voter roll' : 'Add voters'}
          </button>

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
                    {isOrg ? 'Notifications' : 'Emails'} sent ({results.emailsSent.length})
                  </p>
                </div>
              )}
              {results.errors.length > 0 && (
                <div className="rounded-lg bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-800">
                    Errors ({results.errors.length})
                  </p>
                  {results.errors.map((e) => (
                    <p key={e} className="text-xs text-red-600">
                      {e}
                    </p>
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
