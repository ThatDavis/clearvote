'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

export default function NewPollPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const nextKey = useRef(2)
  const [options, setOptions] = useState([
    { key: '0', value: '' },
    { key: '1', value: '' },
  ])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function addOption() {
    const key = String(nextKey.current++)
    setOptions([...options, { key, value: '' }])
  }

  function removeOption(index: number) {
    if (options.length <= 2) return
    setOptions(options.filter((_, i) => i !== index))
  }

  function updateOption(index: number, value: string) {
    const next = [...options]
    next[index] = { ...next[index], value }
    setOptions(next)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const filled = options.map((o) => o.value.trim()).filter(Boolean)
    if (filled.length < 2) {
      setError('At least 2 options are required')
      return
    }

    setSubmitting(true)

    const res = await fetch('/api/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: description || undefined, options: filled }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to create poll')
      setSubmitting(false)
      return
    }

    const poll = await res.json()
    router.push(`/polls/${poll.slug}`)
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Create a poll</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            placeholder="What are we deciding?"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium">
            Description
            <span className="ml-1 text-zinc-400">(optional)</span>
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            placeholder="Add context so voters understand what this poll is about."
          />
        </div>

        <fieldset>
          <legend className="block text-sm font-medium">Options</legend>
          <div className="mt-2 space-y-2">
            {options.map((option, i) => (
              <div key={option.key} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={option.value}
                  onChange={(e) => updateOption(i, e.target.value)}
                  className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  placeholder={`Option ${i + 1}`}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="shrink-0 rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addOption}
            className="mt-2 text-sm text-zinc-600 hover:text-zinc-900"
          >
            + Add option
          </button>
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create poll'}
        </button>
      </form>
    </div>
  )
}
