'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import ApprovalContest from '@/components/ballot/approval-contest'
import RankedContest from '@/components/ballot/ranked-contest'
import YesNoContest from '@/components/ballot/yesno-contest'
import { useToast } from '@/components/toast-provider'

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

function RankedVoteForm({
  pollSlug,
  token,
  options,
  onSuccess,
}: {
  pollSlug: string
  token: string | null
  options: Option[]
  onSuccess: (receipt: string) => void
}) {
  const [rankings, setRankings] = useState<string[]>(options.map((o) => o.id))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    const body: Record<string, unknown> = { pollSlug, rankings }
    if (token) body.token = token
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
    onSuccess(data.receiptCode)
  }

  return (
    <div>
      <RankedContest options={options} value={rankings} onChange={setRankings} />
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

function ApprovalVoteForm({
  pollSlug,
  token,
  options,
  onSuccess,
}: {
  pollSlug: string
  token: string | null
  options: Option[]
  onSuccess: (receipt: string) => void
}) {
  const [approved, setApproved] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    const body: Record<string, unknown> = { pollSlug, rankings: approved }
    if (token) body.token = token
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
    onSuccess(data.receiptCode)
  }

  return (
    <div>
      <ApprovalContest options={options} value={approved} onChange={setApproved} />
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

function YesNoVoteForm({
  pollSlug,
  token,
  options,
  onSuccess,
}: {
  pollSlug: string
  token: string | null
  options: Option[]
  onSuccess: (receipt: string) => void
}) {
  const [votes, setVotes] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    const body: Record<string, unknown> = { pollSlug, rankings: votes }
    if (token) body.token = token
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
    onSuccess(data.receiptCode)
  }

  const allVoted = options.every((o) => votes[o.id])

  return (
    <div>
      <YesNoContest options={options} value={votes} onChange={setVotes} />
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !allVoted}
        className="mt-6 w-full rounded-xl bg-chicago-red px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-chicago-red-dark hover:shadow-md disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit vote'}
      </button>
    </div>
  )
}

export default function VoteForm({ pollSlug, token, options, votingMethod }: Props) {
  const router = useRouter()
  const { showToast } = useToast()
  const [receipt, setReceipt] = useState('')

  function onSuccess(code: string) {
    setReceipt(code)
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

  return (
    <div className="mt-6">
      {votingMethod === 'approval' ? (
        <ApprovalVoteForm
          pollSlug={pollSlug}
          token={token}
          options={options}
          onSuccess={onSuccess}
        />
      ) : votingMethod === 'yesno' ? (
        <YesNoVoteForm pollSlug={pollSlug} token={token} options={options} onSuccess={onSuccess} />
      ) : (
        <RankedVoteForm pollSlug={pollSlug} token={token} options={options} onSuccess={onSuccess} />
      )}
    </div>
  )
}
