'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState } from 'react'

export default function NewElectionForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const orgId = searchParams.get('org')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/elections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          organizationId: orgId ?? undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create election')
      }

      const election = await res.json()
      router.push(`/elections/${election.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p>Please sign in to create an election.</p>
      </div>
    )
  }

  return (
    <div className="w-full px-[10%] py-8">
      <h1 className="text-2xl font-semibold tracking-tight">New Election</h1>
      <p className="mt-2 text-zinc-600">Create a multi-contest election ballot.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6 max-w-xl">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-zinc-700">
            Title
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-chicago-blue focus:outline-none focus:ring-1 focus:ring-chicago-blue"
            placeholder="e.g., 2026 Board Election"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-zinc-700">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-chicago-blue focus:outline-none focus:ring-1 focus:ring-chicago-blue"
            placeholder="Optional description"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center rounded-md bg-chicago-navy px-4 py-2 text-sm font-medium text-white hover:bg-chicago-navy/90 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Election'}
        </button>
      </form>
    </div>
  )
}
