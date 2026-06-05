'use client'

interface Voter {
  id: string
  userId: string
  user: {
    id: string
    name: string
    email: string
  }
}

interface Props {
  voters: Voter[]
  onRemove: (userId: string) => void
  locked?: boolean
}

export default function ElectionVoterRollList({ voters, onRemove, locked }: Props) {
  if (voters.length === 0) {
    return <p className="mt-3 text-sm text-zinc-400">No voters on the roll yet.</p>
  }

  return (
    <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200">
      {voters.map((v) => (
        <li key={v.id} className="flex items-center justify-between px-3 py-2 text-sm">
          <div>
            <span className="font-medium text-zinc-900">{v.user.name}</span>
            <span className="ml-2 text-zinc-500">{v.user.email}</span>
          </div>
          {!locked && (
            <button
              type="button"
              onClick={() => onRemove(v.userId)}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
