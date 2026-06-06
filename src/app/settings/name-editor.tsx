'use client'

import { useState } from 'react'

export default function NameEditor({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName)
  const [isEditing, setIsEditing] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim()) return

    setStatus('loading')
    setError('')

    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (res.ok) {
        setStatus('success')
        setIsEditing(false)
      } else {
        const data = await res.json().catch(() => ({ error: 'Something went wrong' }))
        setError(data.error || 'Failed to update name')
        setStatus('error')
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-chicago-blue focus:outline-none focus:ring-1 focus:ring-chicago-blue"
          maxLength={100}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={status === 'loading'}
          className="rounded-md bg-chicago-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-chicago-navy/90 disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            setName(initialName)
            setIsEditing(false)
            setStatus('idle')
            setError('')
          }}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
        >
          Cancel
        </button>
        {status === 'error' && error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-900">{initialName}</span>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-xs text-chicago-blue hover:text-chicago-blue-dark"
      >
        Edit
      </button>
      {status === 'success' && <span className="text-xs text-green-600">Saved</span>}
    </div>
  )
}
