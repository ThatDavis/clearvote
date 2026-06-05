'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Option {
  id: string
  label: string
  order: number
}

interface Props {
  slug: string
  initialTitle: string
  initialDescription: string | null
  initialOptions: Option[]
}

export default function PollEditor({ slug, initialTitle, initialDescription, initialOptions }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription ?? '')
  const [options, setOptions] = useState(initialOptions.map((o) => o.label))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addOption() {
    setOptions([...options, ''])
  }

  function removeOption(i: number) {
    if (options.length <= 2) return
    setOptions(options.filter((_, idx) => idx !== i))
  }

  function updateOption(i: number, value: string) {
    const next = [...options]
    next[i] = value
    setOptions(next)
  }

  async function save() {
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    const validOptions = options.filter((o) => o.trim())
    if (validOptions.length < 2) {
      setError('At least 2 options are required')
      return
    }

    setSaving(true)
    setError('')

    const res = await fetch(`/api/polls/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        options: validOptions.map((label) => ({ label })),
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to save changes')
      setSaving(false)
      return
    }

    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  function cancel() {
    setTitle(initialTitle)
    setDescription(initialDescription ?? '')
    setOptions(initialOptions.map((o) => o.label))
    setError('')
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="group relative">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-chicago-navy">{initialTitle}</h1>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-1 shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-zinc-500 border border-zinc-200 hover:border-zinc-300 hover:text-zinc-700 transition-colors"
          >
            Edit poll
          </button>
        </div>
        {initialDescription && (
          <p className="mt-3 text-zinc-600 leading-relaxed">{initialDescription}</p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border-2 border-chicago-blue/30 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Edit poll</h2>

      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Optional description"
            className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-2">Options</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-chicago-blue/10 text-xs font-bold text-chicago-blue">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  disabled={options.length <= 2}
                  className="text-zinc-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                  aria-label="Remove option"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addOption}
            className="mt-2 text-xs font-medium text-chicago-blue hover:text-chicago-blue-dark"
          >
            + Add option
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-chicago-navy px-4 py-2 text-sm font-medium text-white hover:bg-chicago-navy/90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={cancel}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
