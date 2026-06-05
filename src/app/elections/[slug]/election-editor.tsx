'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  slug: string
  initialTitle: string
  initialDescription: string | null
  canManage: boolean
  isDraft: boolean
}

export default function ElectionEditor({
  slug,
  initialTitle,
  initialDescription,
  canManage,
  isDraft,
}: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setSaving(true)
    setError('')

    const res = await fetch(`/api/elections/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
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
    setError('')
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="group relative">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-chicago-navy">{initialTitle}</h1>
          {canManage && isDraft && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-1 shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-zinc-500 border border-zinc-200 hover:border-zinc-300 hover:text-zinc-700 transition-colors"
            >
              Edit election
            </button>
          )}
        </div>
        {initialDescription && (
          <p className="mt-3 text-zinc-600 leading-relaxed">{initialDescription}</p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border-2 border-chicago-blue/30 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Edit election</h2>

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="election-title" className="block text-xs font-medium text-zinc-700 mb-1">
            Title
          </label>
          <input
            id="election-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
          />
        </div>

        <div>
          <label
            htmlFor="election-description"
            className="block text-xs font-medium text-zinc-700 mb-1"
          >
            Description
          </label>
          <textarea
            id="election-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Optional description"
            className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-chicago-blue focus:outline-none focus:ring-2 focus:ring-chicago-blue/20"
          />
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
