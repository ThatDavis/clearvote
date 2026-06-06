'use client'

import { useState } from 'react'

export default function SettingsClient({ email }: { email: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleResend() {
    setStatus('loading')
    setError('')

    try {
      const res = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (res.ok) {
        setStatus('success')
      } else {
        const data = await res.json().catch(() => ({ error: 'Something went wrong' }))
        setError(data.error || 'Failed to resend verification email')
        setStatus('error')
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div>
      {status === 'success' ? (
        <p className="text-sm text-green-700">Verification email sent! Check your inbox.</p>
      ) : (
        <button
          type="button"
          onClick={handleResend}
          disabled={status === 'loading'}
          className="inline-flex items-center gap-2 rounded-lg bg-chicago-navy px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-chicago-navy/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' && (
            <svg
              aria-hidden="true"
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          Resend verification email
        </button>
      )}

      {status === 'error' && error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
