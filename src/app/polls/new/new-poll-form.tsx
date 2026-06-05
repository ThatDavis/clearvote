'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/toast-provider'
import VotingMethodSelector from '@/components/voting-method-selector'

type Step = 1 | 2 | 3 | 4

export default function NewPollForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orgId = searchParams.get('org')
  const { showToast } = useToast()
  const [step, setStep] = useState<Step>(1)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [votingMethod, setVotingMethodRaw] = useState('rcv')
  const [seats, setSeats] = useState(1)
  const [threshold, setThreshold] = useState(50)
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const nextKey = useRef(2)
  const [options, setOptions] = useState([
    { key: '0', value: '' },
    { key: '1', value: '' },
  ])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Org poll state
  const [orgName, setOrgName] = useState('')
  const [orgMemberCount, setOrgMemberCount] = useState(0)
  const [voterRollMode, setVoterRollMode] = useState<'all' | 'custom'>('all')

  function setVotingMethod(method: string) {
    setVotingMethodRaw(method)
  }

  // Fetch org details when creating an org poll
  useEffect(() => {
    if (!orgId) return
    fetch(`/api/orgs/${orgId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.name) {
          setOrgName(data.name)
        }
      })
      .catch(() => {
        // Ignore errors, we'll just not show org details
      })

    fetch(`/api/orgs/${orgId}/members`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setOrgMemberCount(data.length)
        }
      })
      .catch(() => {
        // Ignore errors
      })
  }, [orgId])

  // Adjust options count when voting method changes
  useEffect(() => {
    if (votingMethod === 'yesno' && options.length > 1) {
      setOptions([options[0]])
    } else if (votingMethod !== 'yesno' && options.length < 2) {
      const key = String(nextKey.current++)
      setOptions((prev) => [...prev, { key, value: '' }])
    }
  }, [votingMethod])

  function addOption() {
    const key = String(nextKey.current++)
    setOptions([...options, { key, value: '' }])
  }

  function removeOption(index: number) {
    const minOptions = votingMethod === 'yesno' ? 1 : 2
    if (options.length <= minOptions) return
    setOptions(options.filter((_, i) => i !== index))
  }

  function updateOption(index: number, value: string) {
    const next = [...options]
    next[index] = { ...next[index], value }
    setOptions(next)
  }

  function canProceed(): boolean {
    switch (step) {
      case 1:
        return title.trim().length > 0
      case 2:
        return true
      case 3: {
        const minOptions = votingMethod === 'yesno' ? 1 : 2
        return options.filter((o) => o.value.trim()).length >= minOptions
      }
      case 4:
        return true
      default:
        return false
    }
  }

  function nextStep() {
    if (step < 4) {
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
    const filled = options.map((o) => o.value.trim()).filter(Boolean)
    const minOptions = votingMethod === 'yesno' ? 1 : 2
    if (filled.length < minOptions) {
      setError(`At least ${minOptions} option${minOptions === 1 ? '' : 's'} are required`)
      return
    }

    setSubmitting(true)

    const res = await fetch('/api/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: description || undefined,
        options: filled,
        votingMethod,
        seats,
        threshold: votingMethod === 'yesno' ? threshold : undefined,
        startsAt: startsAt ? `${startsAt}T00:00:00` : undefined,
        endsAt: endsAt ? `${endsAt}T00:00:00` : undefined,
        organizationId: orgId || undefined,
        voterRollMode: orgId ? voterRollMode : undefined,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to create poll')
      setSubmitting(false)
      return
    }

    const poll = await res.json()
    showToast('Poll created successfully!', 'success')
    router.push(`/polls/${poll.slug}`)
  }

  const stepTitles = ['Basics', 'Voting Method', 'Options', 'Schedule & Review']

  return (
    <div className="w-full px-[10%] py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-chicago-navy">Create a poll</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Step {step} of 4: {stepTitles[step - 1]}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-chicago-red' : 'bg-zinc-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="space-y-6">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-zinc-900">
                Title
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm shadow-sm transition-colors hover:border-zinc-400 focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
                placeholder="What are we deciding?"
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
                placeholder="Add context so voters understand what this poll is about."
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <p className="block text-sm font-semibold text-zinc-900 mb-3">
                How should people vote?
              </p>
              <VotingMethodSelector value={votingMethod} onChange={setVotingMethod} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="seats" className="block text-sm font-semibold text-zinc-900">
                  Winners
                </label>
                <input
                  id="seats"
                  type="number"
                  min={1}
                  max={20}
                  value={seats}
                  onChange={(e) => setSeats(Number(e.target.value))}
                  className="mt-2 block w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm shadow-sm transition-colors hover:border-zinc-400 focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
                />
              </div>
            </div>

            {votingMethod === 'yesno' && (
              <div>
                <label htmlFor="threshold" className="block text-sm font-semibold text-zinc-900">
                  Pass threshold (%)
                </label>
                <input
                  id="threshold"
                  type="number"
                  min={1}
                  max={100}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="mt-2 block w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm shadow-sm transition-colors hover:border-zinc-400 focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Percentage of yes votes required to pass. Default: 50%.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <p className="block text-sm font-semibold text-zinc-900">Poll Options</p>
              <p className="mt-1 text-xs text-zinc-500">
                {votingMethod === 'yesno'
                  ? 'Add the proposition or question voters will vote yes/no on.'
                  : 'Add at least 2 options. Voters will choose from these.'}
              </p>
              <div className="mt-3 space-y-3">
                {options.map((option, i) => (
                  <div key={option.key} className="flex gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-sm font-medium text-zinc-500">
                      {i + 1}
                    </div>
                    <input
                      type="text"
                      required
                      value={option.value}
                      onChange={(e) => updateOption(i, e.target.value)}
                      className="block w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm shadow-sm transition-colors hover:border-zinc-400 focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
                      placeholder={`Option ${i + 1}`}
                    />
                    {options.length > (votingMethod === 'yesno' ? 1 : 2) && (
                      <button
                        type="button"
                        onClick={() => removeOption(i)}
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
                onClick={addOption}
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
        )}

        {step === 4 && (
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

            {/* Voter roll options for org polls */}
            {orgId && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-5">
                <h3 className="text-sm font-semibold text-zinc-900">Voter roll</h3>
                <p className="mt-1 text-sm text-zinc-500">Choose who can vote in this poll.</p>
                <div className="mt-4 space-y-3">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="radio"
                      name="voterRollMode"
                      checked={voterRollMode === 'all'}
                      onChange={() => setVoterRollMode('all')}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">
                      All organization members ({orgMemberCount > 0 ? orgMemberCount : '...'})
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="radio"
                      name="voterRollMode"
                      checked={voterRollMode === 'custom'}
                      onChange={() => setVoterRollMode('custom')}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Custom voter roll</span>
                  </label>
                </div>
              </div>
            )}

            {/* Review summary */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-5">
              <h3 className="text-sm font-semibold text-zinc-900">Review</h3>
              <dl className="mt-3 space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-zinc-500">Title</dt>
                  <dd className="text-sm font-medium text-zinc-900">{title}</dd>
                </div>
                {orgId && orgName && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-zinc-500">Organization</dt>
                    <dd className="text-sm font-medium text-zinc-900">{orgName}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-sm text-zinc-500">Method</dt>
                  <dd className="text-sm font-medium text-zinc-900 capitalize">{votingMethod}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-zinc-500">Winners</dt>
                  <dd className="text-sm font-medium text-zinc-900">{seats}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-zinc-500">Options</dt>
                  <dd className="text-sm font-medium text-zinc-900">
                    {options.filter((o) => o.value.trim()).length}
                  </dd>
                </div>
                {orgId && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-zinc-500">Voter roll</dt>
                    <dd className="text-sm font-medium text-zinc-900">
                      {voterRollMode === 'all' ? 'All members' : 'Custom'}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Navigation buttons */}
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
          {step < 4 ? (
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
              {submitting ? 'Creating...' : 'Create poll'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
