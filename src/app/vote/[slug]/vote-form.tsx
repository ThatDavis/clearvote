'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useToast } from '@/components/toast-provider'
import { getMethod } from '@/lib/voting-methods'

interface Option {
  id: string
  label: string
}

interface Props {
  pollSlug: string
  token: string | null
  options: Option[]
  votingMethod: string
}

export default function VoteForm({ pollSlug, token, options, votingMethod }: Props) {
  const router = useRouter()
  const { showToast } = useToast()
  const [receipt, setReceipt] = useState('')
  const [emailed, setEmailed] = useState(false)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const method = getMethod(votingMethod)
  const [value, setValue] = useState(method.emptyBallot)

  // Anonymous voters reach this form with a token; registered voters do not.
  const isAnonymous = token !== null

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    const body: Record<string, unknown> = { pollSlug, rankings: value }
    if (token) body.token = token
    if (token && email.trim()) body.email = email.trim()
    const res = await fetch('/api/ballots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to cast vote')
      setSubmitting(false)
      return
    }
    const data = await res.json()
    setReceipt(data.receiptCode)
    setEmailed(Boolean(data.emailed))
    showToast('Vote cast successfully!', 'success')
  }

  if (receipt) {
    return (
      <div className="mt-8 rounded-2xl border-2 border-green-200 bg-green-50 p-8 text-center">
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
        <p className="text-xl font-bold text-green-800">Vote cast!</p>
        <p className="mt-2 text-sm text-green-700">
          Your receipt code:{' '}
          <span className="rounded-lg bg-white px-2 py-1 font-mono font-bold">{receipt}</span>
        </p>
        <p className="mt-3 text-sm text-green-600">
          Save this code to verify your vote was counted.
        </p>
        {emailed && (
          <p className="mt-2 text-sm text-green-600">
            A copy has been emailed to you. It confirms your ballot was recorded and does not reveal
            how you voted.
          </p>
        )}
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

  const BallotComponent = method.BallotComponent

  return (
    <div className="mt-6">
      {isAnonymous ? (
        <div className="mb-6">
          <label htmlFor="confirmation-email" className="block text-sm font-medium text-zinc-700">
            Email my confirmation (optional)
          </label>
          <input
            id="confirmation-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="mt-2 w-full rounded-xl border-2 border-zinc-200 px-4 py-3 text-sm text-zinc-900 transition-colors focus:border-chicago-blue focus:outline-none"
          />
          <p className="mt-2 text-xs text-zinc-500">
            We will email your receipt code so you can confirm your ballot was recorded. Your
            address is used only to send this one message and is never stored with your ballot.
          </p>
        </div>
      ) : (
        <p className="mb-6 text-sm text-zinc-500">
          A confirmation with your receipt code will be emailed to your account.
        </p>
      )}

      <BallotComponent options={options} value={value} onChange={setValue} />

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-6 w-full rounded-xl bg-chicago-red px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-chicago-red-dark hover:shadow-md disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit vote'}
      </button>
    </div>
  )
}
