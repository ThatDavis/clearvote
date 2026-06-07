'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('No verification token provided.')
      return
    }

    fetch('/api/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus('success')
        } else {
          const data = await res.json()
          setError(data.error || 'Failed to verify email')
          setStatus('error')
        }
      })
      .catch(() => {
        setError('Something went wrong. Please try again.')
        setStatus('error')
      })
  }, [token])

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      {status === 'loading' && (
        <>
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-chicago-red" />
          <p className="mt-4 text-zinc-600">Verifying your email...</p>
        </>
      )}

      {status === 'success' && (
        <>
          <h1 className="text-2xl font-semibold text-green-700">Email verified!</h1>
          <p className="mt-4 text-zinc-600">
            Your email has been verified. You can now be added to voter rolls.
          </p>
          <a
            href="/login"
            className="mt-6 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Log in
          </a>
        </>
      )}

      {status === 'error' && (
        <>
          <h1 className="text-2xl font-semibold text-red-700">Verification failed</h1>
          <p className="mt-4 text-zinc-600">{error}</p>
          <div className="mt-6 space-y-3">
            <a
              href="/login"
              className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Go to login
            </a>
            <p className="text-sm text-zinc-500">
              Didn't receive the email?{' '}
              <a href="/login" className="text-chicago-blue hover:underline">
                Log in to resend
              </a>
            </p>
          </div>
        </>
      )}
    </div>
  )
}
