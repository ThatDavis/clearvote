'use client'

import { useState } from 'react'

export default function PasswordEditor() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSave() {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      setStatus('error')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      setStatus('error')
      return
    }

    setStatus('loading')
    setError('')

    try {
      const res = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (res.ok) {
        setStatus('success')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => {
          setIsEditing(false)
          setStatus('idle')
        }, 2000)
      } else {
        const data = await res.json().catch(() => ({ error: 'Something went wrong' }))
        setError(data.error || 'Failed to change password')
        setStatus('error')
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-sm text-chicago-blue hover:text-chicago-blue-dark"
      >
        Change password
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="currentPassword" className="block text-xs font-medium text-zinc-700">
          Current password
        </label>
        <input
          id="currentPassword"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-chicago-blue focus:outline-none focus:ring-1 focus:ring-chicago-blue"
        />
      </div>
      <div>
        <label htmlFor="newPassword" className="block text-xs font-medium text-zinc-700">
          New password
        </label>
        <input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-chicago-blue focus:outline-none focus:ring-1 focus:ring-chicago-blue"
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-xs font-medium text-zinc-700">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-chicago-blue focus:outline-none focus:ring-1 focus:ring-chicago-blue"
        />
      </div>
      {status === 'error' && error && <p className="text-sm text-red-600">{error}</p>}
      {status === 'success' && (
        <p className="text-sm text-green-600">Password changed successfully</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={status === 'loading'}
          className="rounded-md bg-chicago-navy px-4 py-2 text-sm font-medium text-white hover:bg-chicago-navy/90 disabled:opacity-50"
        >
          {status === 'loading' ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsEditing(false)
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setStatus('idle')
            setError('')
          }}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
