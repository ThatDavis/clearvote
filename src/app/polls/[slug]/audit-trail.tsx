'use client'

import { useEffect, useState } from 'react'

interface AuditLog {
  id: string
  action: string
  detail: string | null
  createdAt: string
}

const actionLabels: Record<string, string> = {
  tokens_generated: 'Tokens generated',
  poll_opened: 'Poll opened',
  poll_closed: 'Poll closed',
  voter_added: 'Voter added',
  voter_removed: 'Voter removed',
  ballot_cast: 'Ballot cast',
  results_viewed: 'Results viewed',
}

interface Props {
  slug: string
}

export default function AuditTrail({ slug }: Props) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch(`/api/polls/${slug}/audit`)
      .then((res) => res.json())
      .then((data) => {
        if (data.logs) setLogs(data.logs)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load audit trail')
        setLoading(false)
      })
  }, [slug])

  if (loading) {
    return (
      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
        <p className="text-sm text-zinc-500">Loading audit trail...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Audit trail</h2>
        <p className="mt-1 text-sm text-zinc-500">No events recorded yet.</p>
      </div>
    )
  }

  const displayLogs = expanded ? logs : logs.slice(-5)
  const hasMore = logs.length > 5

  return (
    <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Audit trail</h2>
        <span className="text-xs text-zinc-500">{logs.length} event{logs.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="mt-1 text-xs text-zinc-500">Chronological record of all significant actions.</p>

      <ul className="mt-4 space-y-3">
        {displayLogs.map((log) => (
          <li key={log.id} className="flex items-start gap-3 text-sm">
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-chicago-blue"></span>
            <div className="flex-1">
              <p className="font-medium text-zinc-900">{actionLabels[log.action] || log.action}</p>
              {log.detail && <p className="text-xs text-zinc-500">{log.detail}</p>}
              <p className="text-xs text-zinc-400">{new Date(log.createdAt).toLocaleString()}</p>
            </div>
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs font-medium text-chicago-blue hover:text-chicago-blue-dark transition-colors"
        >
          {expanded ? 'Show less' : `Show all ${logs.length} events`}
        </button>
      )}
    </div>
  )
}
