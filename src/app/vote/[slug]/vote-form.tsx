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
      className={`flex items-center gap-3 rounded-md border px-3 py-3 ${isDragging ? 'border-zinc-900 bg-zinc-100 shadow-lg z-10' : 'border-zinc-200 bg-white'}`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-600">
        {index + 1}
      </span>
      <span className="flex-1 text-sm">{option.label}</span>
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded px-2 py-1 text-zinc-400 hover:text-zinc-600 active:cursor-grabbing"
        aria-label={`Drag to reorder ${option.label}`}
      >
        ⠿
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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((option, index) => (
              <SortableOption key={option.id} option={option} index={index} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-6 w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
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
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-3 rounded-md border border-zinc-200 px-3 py-3 hover:bg-zinc-50"
          >
            <input
              type="checkbox"
              checked={approved.has(option.id)}
              onChange={() => toggle(option.id)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            <span className="text-sm">{option.label}</span>
          </label>
        ))}
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-6 w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
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
      <div className="space-y-3">
        {options.map((option) => (
          <div key={option.id} className="rounded-md border border-zinc-200 p-3">
            <span className="block text-sm font-medium">{option.label}</span>
            <div className="mt-2 flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`vote-${option.id}`}
                  checked={votes[option.id] === 'yes'}
                  onChange={() => setVotes({ ...votes, [option.id]: 'yes' })}
                  className="h-4 w-4"
                />
                Yes
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`vote-${option.id}`}
                  checked={votes[option.id] === 'no'}
                  onChange={() => setVotes({ ...votes, [option.id]: 'no' })}
                  className="h-4 w-4"
                />
                No
              </label>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !allVoted}
        className="mt-6 w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit vote'}
      </button>
    </div>
  )
}

export default function VoteForm({ pollSlug, token, options, votingMethod }: Props) {
  const router = useRouter()
  const [receipt, setReceipt] = useState('')

  function onSuccess(code: string) {
    setReceipt(code)
  }

  if (receipt) {
    return (
      <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-lg font-medium text-green-800">Vote cast!</p>
        <p className="mt-1 text-sm text-green-700">
          Your receipt code: <span className="font-mono font-semibold">{receipt}</span>
        </p>
        <p className="mt-3 text-sm text-green-600">
          Save this code to verify your vote was counted.
        </p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mt-4 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
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
