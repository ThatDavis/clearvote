'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useRef, useState } from 'react'
import { useToast } from '@/components/toast-provider'
import VotingMethodSelector from '@/components/voting-method-selector'
import { getMethod } from '@/lib/voting-methods'

type Step = 1 | 2 | 3

interface ContestDraft {
  id: string
  title: string
  description: string
  votingMethod: string
  seats: number
  threshold: number
  options: { key: string; value: string }[]
}

export default function NewElectionForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orgId = searchParams.get('org')
  const { showToast } = useToast()
  const [step, setStep] = useState<Step>(1)

  // Election basics
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')

  // Contests
  const nextContestId = useRef(1)
  const nextOptionKey = useRef(0)
  const [contests, setContests] = useState<ContestDraft[]>([createEmptyContest()])
  const [activeContestIndex, setActiveContestIndex] = useState(0)

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function createEmptyContest(): ContestDraft {
    return {
      id: String(nextContestId.current++),
      title: '',
      description: '',
      votingMethod: 'rcv',
      seats: 1,
      threshold: 50,
      options: [
        { key: String(nextOptionKey.current++), value: '' },
        { key: String(nextOptionKey.current++), value: '' },
      ],
    }
  }

  function addContest() {
    setContests([...contests, createEmptyContest()])
    setActiveContestIndex(contests.length)
  }

  function removeContest(index: number) {
    if (contests.length <= 1) return
    const next = contests.filter((_, i) => i !== index)
    setContests(next)
    setActiveContestIndex(Math.min(activeContestIndex, next.length - 1))
  }

  function updateContest(index: number, updates: Partial<ContestDraft>) {
    const next = [...contests]
    next[index] = { ...next[index], ...updates }
    setContests(next)
  }

  function addOption(contestIndex: number) {
    const contest = contests[contestIndex]
    updateContest(contestIndex, {
      options: [...contest.options, { key: String(nextOptionKey.current++), value: '' }],
    })
  }

  function removeOption(contestIndex: number, optionIndex: number) {
    const contest = contests[contestIndex]
    const minOptions = getMethod(contest.votingMethod).minOptions
    if (contest.options.length <= minOptions) return
    updateContest(contestIndex, {
      options: contest.options.filter((_, i) => i !== optionIndex),
    })
  }

  function updateOption(contestIndex: number, optionIndex: number, value: string) {
    const contest = contests[contestIndex]
    const nextOptions = [...contest.options]
    nextOptions[optionIndex] = { ...nextOptions[optionIndex], value }
    updateContest(contestIndex, { options: nextOptions })
  }

  // Adjust options count when voting method changes
  function setContestMethod(contestIndex: number, method: string) {
    const contest = contests[contestIndex]
    const min = getMethod(method).minOptions
    let nextOptions = [...contest.options]
    if (nextOptions.length > min) {
      nextOptions = nextOptions.slice(0, min)
    } else if (nextOptions.length < min) {
      const extra = Array.from({ length: min - nextOptions.length }, () => ({
        key: String(nextOptionKey.current++),
        value: '',
      }))
      nextOptions = [...nextOptions, ...extra]
    }
    updateContest(contestIndex, { votingMethod: method, options: nextOptions })
  }

  function canProceed(): boolean {
    switch (step) {
      case 1:
        return title.trim().length > 0
      case 2: {
        return contests.every((c) => {
          if (!c.title.trim()) return false
          const minOptions = getMethod(c.votingMethod).minOptions
          return c.options.filter((o) => o.value.trim()).length >= minOptions
        })
      }
      case 3:
        return true
      default:
        return false
    }
  }

  function nextStep() {
    if (step < 3) {
      setStep((s) => (s + 1) as Step)
      setError('')
    }
  }

  function prevStep() {
    if (step > 1) {
      setStep((s) => (s - 1) as Step)
      setError('')
    }
  }

  async function handleSubmit() {
    setError('')

    // Validate contests
    for (const contest of contests) {
      const minOptions = getMethod(contest.votingMethod).minOptions
      const filled = contest.options.map((o) => o.value.trim()).filter(Boolean)
      if (filled.length < minOptions) {
        setError(
          `Contest "${contest.title || 'Untitled'}" needs at least ${minOptions} option${minOptions === 1 ? '' : 's'}`,
        )
        return
      }
    }

    setSubmitting(true)

    // Create election first
    const electionRes = await fetch('/api/elections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: description || undefined,
        organizationId: orgId || undefined,
        startsAt: startsAt || undefined,
        endsAt: endsAt || undefined,
      }),
    })

    if (!electionRes.ok) {
      const data = await electionRes.json()
      setError(data.error || 'Failed to create election')
      setSubmitting(false)
      return
    }

    const election = await electionRes.json()

    // Create contests
    for (const contest of contests) {
      const filledOptions = contest.options.map((o) => o.value.trim()).filter(Boolean)
      const method = getMethod(contest.votingMethod)
      const contestRes = await fetch(`/api/elections/${election.slug}/contests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: contest.title,
          description: contest.description || undefined,
          votingMethod: contest.votingMethod,
          seats: method.uses.seats ? contest.seats : undefined,
          threshold: method.uses.threshold ? contest.threshold : undefined,
          options: filledOptions,
        }),
      })

      if (!contestRes.ok) {
        const data = await contestRes.json()
        setError(data.error || `Failed to add contest "${contest.title}"`)
        setSubmitting(false)
        return
      }
    }

    showToast('Election created successfully!', 'success')
    router.push(`/elections/${election.slug}`)
  }

  const stepTitles = ['Election Basics', 'Add Contests', 'Schedule & Review']

  return (
    <div className="w-full px-[10%] py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-chicago-navy">Create an election</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Step {step} of 3: {stepTitles[step - 1]}
        </p>
      </div>

      <div className="mb-8">
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-chicago-red' : 'bg-zinc-200'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-zinc-900">
                Election Title
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm shadow-sm transition-colors hover:border-zinc-400 focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
                placeholder="e.g., 2026 Board Election"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-zinc-900">
                Description
                <span className="ml-1 font-normal text-zinc-400">(optional)</span>
              </label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm shadow-sm transition-colors hover:border-zinc-400 focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
                placeholder="Describe what this election is for."
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-900">Contests</p>
                <p className="text-xs text-zinc-500">Add one or more contests to this election.</p>
              </div>
              <button
                type="button"
                onClick={addContest}
                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-chicago-blue hover:text-chicago-blue"
              >
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add contest
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {contests.map((contest, i) => (
                <button
                  key={contest.id}
                  type="button"
                  onClick={() => setActiveContestIndex(i)}
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    activeContestIndex === i
                      ? 'bg-chicago-navy text-white'
                      : 'bg-white text-zinc-700 border border-zinc-300 hover:border-chicago-blue'
                  }`}
                >
                  {contest.title.trim() || `Contest ${i + 1}`}
                  {contests.length > 1 && (
                    <button
                      type="button"
                      className="ml-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeContest(i)
                      }}
                      aria-label={`Remove contest ${i + 1}`}
                    >
                      ×
                    </button>
                  )}
                </button>
              ))}
            </div>

            {contests.map((contest, ci) => (
              <div
                key={contest.id}
                className={`space-y-6 ${ci === activeContestIndex ? 'block' : 'hidden'}`}
              >
                <div className="rounded-xl border-2 border-zinc-200 bg-white p-5 space-y-6">
                  <div>
                    <label
                      htmlFor={`contest-title-${contest.id}`}
                      className="block text-sm font-semibold text-zinc-900"
                    >
                      Contest Title
                    </label>
                    <input
                      id={`contest-title-${contest.id}`}
                      type="text"
                      value={contest.title}
                      onChange={(e) => updateContest(ci, { title: e.target.value })}
                      className="mt-2 block w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm shadow-sm transition-colors hover:border-zinc-400 focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
                      placeholder="e.g., President"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`contest-desc-${contest.id}`}
                      className="block text-sm font-semibold text-zinc-900"
                    >
                      Description <span className="font-normal text-zinc-400">(optional)</span>
                    </label>
                    <textarea
                      id={`contest-desc-${contest.id}`}
                      rows={2}
                      value={contest.description}
                      onChange={(e) => updateContest(ci, { description: e.target.value })}
                      className="mt-2 block w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm shadow-sm transition-colors hover:border-zinc-400 focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
                      placeholder="Add context for this contest."
                    />
                  </div>

                  <div>
                    <p className="block text-sm font-semibold text-zinc-900 mb-3">Voting Method</p>
                    <VotingMethodSelector
                      value={contest.votingMethod}
                      onChange={(method) => setContestMethod(ci, method)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor={`contest-seats-${contest.id}`}
                        className="block text-sm font-semibold text-zinc-900"
                      >
                        Winners
                      </label>
                      <input
                        id={`contest-seats-${contest.id}`}
                        type="number"
                        min={1}
                        max={20}
                        value={contest.seats}
                        onChange={(e) => updateContest(ci, { seats: Number(e.target.value) })}
                        className="mt-2 block w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm shadow-sm transition-colors hover:border-zinc-400 focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
                      />
                    </div>
                    {getMethod(contest.votingMethod).uses.threshold && (
                      <div>
                        <label
                          htmlFor={`contest-threshold-${contest.id}`}
                          className="block text-sm font-semibold text-zinc-900"
                        >
                          Pass threshold (%)
                        </label>
                        <input
                          id={`contest-threshold-${contest.id}`}
                          type="number"
                          min={1}
                          max={100}
                          value={contest.threshold}
                          onChange={(e) => updateContest(ci, { threshold: Number(e.target.value) })}
                          className="mt-2 block w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm shadow-sm transition-colors hover:border-zinc-400 focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
                        />
                        <p className="mt-2 text-xs text-zinc-500">
                          Percentage of yes votes required to pass.
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="block text-sm font-semibold text-zinc-900">Options</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {getMethod(contest.votingMethod).ballotShape === 'map'
                        ? 'Add the proposition or question voters will vote yes/no on.'
                        : 'Add at least 2 options. Voters will choose from these.'}
                    </p>
                    <div className="mt-3 space-y-3">
                      {contest.options.map((option, oi) => (
                        <div key={option.key} className="flex gap-2">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-sm font-medium text-zinc-500">
                            {oi + 1}
                          </div>
                          <input
                            type="text"
                            value={option.value}
                            onChange={(e) => updateOption(ci, oi, e.target.value)}
                            className="block w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm shadow-sm transition-colors hover:border-zinc-400 focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
                            placeholder={`Option ${oi + 1}`}
                          />
                          {contest.options.length > getMethod(contest.votingMethod).minOptions && (
                            <button
                              type="button"
                              onClick={() => removeOption(ci, oi)}
                              className="shrink-0 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                            >
                              <svg
                                aria-hidden="true"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => addOption(ci)}
                      className="mt-3 inline-flex items-center gap-1 rounded-lg border border-dashed border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-chicago-blue hover:text-chicago-blue"
                    >
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Add option
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="startsAt" className="block text-sm font-semibold text-zinc-900">
                  Start date <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <input
                  id="startsAt"
                  type="date"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="mt-2 block w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm shadow-sm transition-colors hover:border-zinc-400 focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
                />
              </div>
              <div>
                <label htmlFor="endsAt" className="block text-sm font-semibold text-zinc-900">
                  End date <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <input
                  id="endsAt"
                  type="date"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="mt-2 block w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm shadow-sm transition-colors hover:border-zinc-400 focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
                />
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-5">
              <h3 className="text-sm font-semibold text-zinc-900">Review</h3>
              <dl className="mt-3 space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-zinc-500">Election Title</dt>
                  <dd className="text-sm font-medium text-zinc-900">{title}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-zinc-500">Contests</dt>
                  <dd className="text-sm font-medium text-zinc-900">{contests.length}</dd>
                </div>
                {startsAt && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-zinc-500">Start date</dt>
                    <dd className="text-sm font-medium text-zinc-900">
                      {new Date(`${startsAt}T00:00:00`).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                {endsAt && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-zinc-500">End date</dt>
                    <dd className="text-sm font-medium text-zinc-900">
                      {new Date(`${endsAt}T00:00:00`).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-4 space-y-3">
                {contests.map((contest, i) => (
                  <div key={contest.id} className="rounded-lg border border-zinc-200 bg-white p-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">
                        {i + 1}. {contest.title}
                      </span>
                      <span className="text-xs text-zinc-500 capitalize">
                        {contest.votingMethod}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {contest.options.filter((o) => o.value.trim()).length} option
                      {contest.options.filter((o) => o.value.trim()).length !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          {step > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:border-zinc-400"
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={!canProceed()}
              className="ml-auto rounded-lg bg-chicago-red px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-chicago-red-dark hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !canProceed()}
              className="ml-auto rounded-lg bg-chicago-red px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-chicago-red-dark hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create election'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
