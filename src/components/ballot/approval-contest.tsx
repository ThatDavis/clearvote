'use client'

interface Option {
  id: string
  label: string
}

interface Props {
  options: Option[]
  value: string[] | Record<string, string>
  onChange: (value: string[] | Record<string, string>) => void
}

export default function ApprovalContest({ options, value, onChange }: Props) {
  const approved = new Set(Array.isArray(value) ? value : [])

  function toggle(id: string) {
    const next = new Set(approved)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(Array.from(next))
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
    </div>
  )
}
