'use client'

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
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

function SortableOption({ option, index }: { option: Option; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: option.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border-2 px-4 py-4 transition-shadow ${
        isDragging
          ? 'border-chicago-blue bg-white shadow-xl z-10 scale-[1.02]'
          : 'border-zinc-200 bg-white hover:border-chicago-blue/30 hover:shadow-sm'
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-chicago-red/10 text-sm font-bold text-chicago-red">
        {index + 1}
      </span>
      <span className="flex-1 text-sm font-medium text-zinc-900">{option.label}</span>
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded-lg px-2 py-1 text-zinc-400 transition-colors hover:text-chicago-blue hover:bg-chicago-blue/10 active:cursor-grabbing"
        aria-label={`Drag to reorder ${option.label}`}
      >
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>
    </div>
  )
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
  const [items, setItems] = useState(options)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setItems((current) => {
      const oldIndex = current.findIndex((o) => o.id === active.id)
      const newIndex = current.findIndex((o) => o.id === over.id)
      return arrayMove(current, oldIndex, newIndex)
    })
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    const rankings = items.map((o) => o.id)
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
      <p className="mb-4 text-sm text-zinc-500">
        Drag to rank your choices from most preferred (1) to least preferred.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {items.map((option, index) => (
              <SortableOption key={option.id} option={option} index={index} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
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
  const [approved, setApproved] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function toggle(id: string) {
    const next = new Set(approved)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setApproved(next)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    const rankings = Array.from(approved)
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
      <p className="mb-4 text-sm text-zinc-500">
        Select all options you approve of. You can choose as many as you like.
      </p>
      <div className="space-y-3">
        {options.map((option) => (
          <label
            key={option.id}
            className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 px-4 py-4 transition-all ${
              approved.has(option.id)
                ? 'border-chicago-blue bg-chicago-blue/5'
                : 'border-zinc-200 bg-white hover:border-chicago-blue/30'
            }`}
          >
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-all ${
                approved.has(option.id) ? 'border-chicago-blue bg-chicago-blue' : 'border-zinc-300'
              }`}
            >
              {approved.has(option.id) && (
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <input
              type="checkbox"
              checked={approved.has(option.id)}
              onChange={() => toggle(option.id)}
              className="sr-only"
            />
            <span className="text-sm font-medium text-zinc-900">{option.label}</span>
          </label>
        ))}
      </div>
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
      <p className="mb-4 text-sm text-zinc-500">Vote yes or no on each option below.</p>
      <div className="space-y-4">
        {options.map((option) => (
          <div
            key={option.id}
            className="rounded-xl border-2 border-zinc-200 bg-white p-4 transition-colors hover:border-chicago-blue/30"
          >
            <span className="block text-sm font-semibold text-zinc-900">{option.label}</span>
            <div className="mt-3 flex gap-3">
              {(['yes', 'no', 'abstain'] as const).map((choice) => {
                const isSelected = votes[option.id] === choice
                const baseClasses =
                  'flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all'
                const selectedClasses =
                  choice === 'yes'
                    ? 'bg-green-100 text-green-800 border-2 border-green-300'
                    : choice === 'no'
                      ? 'bg-red-100 text-red-800 border-2 border-red-300'
                      : 'bg-zinc-100 text-zinc-700 border-2 border-zinc-300'
                const unselectedClasses =
                  'border-2 border-zinc-200 text-zinc-600 hover:border-zinc-300'

                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => setVotes({ ...votes, [option.id]: choice })}
                    className={`${baseClasses} ${isSelected ? selectedClasses : unselectedClasses}`}
                  >
                    {choice === 'yes' && (
                      <span className="flex items-center justify-center gap-2">
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
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Yes
                      </span>
                    )}
                    {choice === 'no' && (
                      <span className="flex items-center justify-center gap-2">
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        No
                      </span>
                    )}
                    {choice === 'abstain' && (
                      <span className="flex items-center justify-center gap-2">
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
                            d="M20 12H4"
                          />
                        </svg>
                        Abstain
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
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
