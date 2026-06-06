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

export default function YesNoContest({ options, value, onChange }: Props) {
  const votes = !Array.isArray(value) ? value : {}
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
                    onClick={() => onChange({ ...value, [option.id]: choice })}
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
    </div>
  )
}
