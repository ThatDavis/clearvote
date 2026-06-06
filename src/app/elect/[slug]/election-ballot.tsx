'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { getMethod } from '@/lib/voting-methods'
import type { RawBallot } from '@/lib/voting-methods/types'

interface Option {
  id: string
  label: string
}

interface Contest {
  id: string
  title: string
  description: string | null
  votingMethod: string
  seats: number
  options: Option[]
}

interface Election {
  id: string
  title: string
  slug: string
}

interface Props {
  election: Election
  contests: Contest[]
  token: string | null
  credentialType: 'token' | 'session'
}

export default function ElectionBallot({
  election,
  contests,
  token,
  credentialType: _credentialType,
}: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'vote' | 'review' | 'receipt'>('vote')
  const [selections, setSelections] = useState<Record<string, RawBallot>>(() => {
    const init: Record<string, RawBallot> = {}
    for (const contest of contests) {
      init[contest.id] = getMethod(contest.votingMethod).emptyBallot()
    }
    return init
  })
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [receiptCode, setReceiptCode] = useState('')

  const totalContests = contests.length
  const completedContests = contests.filter((c) => {
    if (skipped.has(c.id)) return true
    const val = selections[c.id]
    if (Array.isArray(val)) return true // ranking/approval can be empty
    return Object.keys(val).length > 0 // yesno must have at least one vote
  }).length

  function updateSelection(contestId: string, value: RawBallot) {
    setSelections((prev) => ({ ...prev, [contestId]: value }))
    setSkipped((prev) => {
      const next = new Set(prev)
      next.delete(contestId)
      return next
    })
  }

  function toggleSkip(contestId: string) {
    setSkipped((prev) => {
      const next = new Set(prev)
      if (next.has(contestId)) {
        next.delete(contestId)
      } else {
        next.add(contestId)
      }
      return next
    })
  }

  function getContestValue(contest: Contest): RawBallot {
    if (skipped.has(contest.id)) {
      return getMethod(contest.votingMethod).emptyBallot()
    }
    return selections[contest.id] ?? getMethod(contest.votingMethod).emptyBallot()
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')

    const body: Record<string, unknown> = {
      contests: contests.map((c) => ({
        contestId: c.id,
        rankings: getContestValue(c),
      })),
    }
    if (token) body.token = token

    try {
      const res = await fetch(`/api/elections/${election.slug}/ballots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to cast ballot')
      }

      const data = await res.json()
      setReceiptCode(data.receiptCode)
      setStep('receipt')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'receipt') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            aria-hidden="true"
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-xl font-bold text-green-800">Ballot cast!</p>
        <p className="mt-2 text-sm text-green-700">
          Your receipt code:{' '}
          <span className="rounded-lg bg-white px-2 py-1 font-mono font-bold">{receiptCode}</span>
        </p>
        <p className="mt-3 text-sm text-green-600">
          Save this code to verify your ballot was counted.
        </p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green-700 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-green-800 hover:shadow-md"
        >
          Done
        </button>
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight">Review your ballot</h1>
        <p className="mt-2 text-zinc-600">Please review your selections before submitting.</p>

        <div className="mt-8 space-y-6">
          {contests.map((contest, i) => {
            const isSkipped = skipped.has(contest.id)
            const val = selections[contest.id]
            const method = getMethod(contest.votingMethod)

            return (
              <div key={contest.id} className="rounded-xl border-2 border-zinc-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    {i + 1}. {contest.title}
                  </div>
                  {isSkipped && <span className="text-xs text-zinc-500">Skipped</span>}
                </div>

                {!isSkipped && method.ballotShape === 'ranking' && Array.isArray(val) && (
                  <div className="mt-2 text-sm text-zinc-700">
                    {val.length > 0
                      ? val
                          .map((id) => contest.options.find((o) => o.id === id)?.label)
                          .filter(Boolean)
                          .join(' > ')
                      : 'No selection'}
                  </div>
                )}

                {!isSkipped && method.ballotShape === 'map' && !Array.isArray(val) && (
                  <div className="mt-2 space-y-1">
                    {contest.options.map((opt) => (
                      <div key={opt.id} className="flex justify-between text-sm">
                        <span>{opt.label}</span>
                        <span className="font-medium capitalize">
                          {(val as Record<string, string>)[opt.id] || 'No vote'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => setStep('vote')}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Back to edit
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-chicago-red px-4 py-2 text-sm font-medium text-white hover:bg-chicago-red-dark disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Confirm and submit'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{election.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Contest {completedContests} of {totalContests}
          </p>
        </div>
        <div className="h-2 w-32 rounded-full bg-zinc-200">
          <div
            className="h-2 rounded-full bg-chicago-blue transition-all"
            style={{ width: `${(completedContests / totalContests) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-8">
        {contests.map((contest, i) => {
          const isSkipped = skipped.has(contest.id)
          const method = getMethod(contest.votingMethod)
          const BallotComponent = method.BallotComponent

          return (
            <div
              key={contest.id}
              className={`rounded-xl border-2 p-5 ${isSkipped ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-200 bg-white'}`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {i + 1}. {contest.title}
                  </div>
                  {contest.description && (
                    <p className="mt-1 text-sm text-zinc-500">{contest.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => toggleSkip(contest.id)}
                  className={`text-xs ${isSkipped ? 'text-zinc-700 hover:text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  {isSkipped ? 'Include this contest' : 'Skip this contest'}
                </button>
              </div>

              {!isSkipped && (
                <BallotComponent
                  options={contest.options}
                  value={selections[contest.id] ?? method.emptyBallot()}
                  onChange={(next) => updateSelection(contest.id, next)}
                />
              )}

              {isSkipped && (
                <p className="text-sm text-zinc-500 italic">This contest will be left blank.</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={() => setStep('review')}
          className="w-full rounded-xl bg-chicago-red px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-chicago-red-dark hover:shadow-md"
        >
          Review ballot
        </button>
      </div>
    </div>
  )
}
