'use client'

import { useState } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: string | null
  emailVerified: string | null
  createdAt: string
  _count: { memberships: number }
}

export default function AdminUserList({ users }: { users: User[] }) {
  const [search, setSearch] = useState('')
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  )

  async function handleResetPassword() {
    if (!resetTarget) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/users/${resetTarget.id}/password-reset`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reset password')
      }
      const data = await res.json()
      setTempPassword(data.tempPassword)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete user')
      }
      setDeleteTarget(null)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email..."
        className="mt-4 w-full rounded-xl border-2 border-zinc-200 px-4 py-2.5 text-sm text-zinc-900 transition-colors focus:border-chicago-blue focus:outline-none"
      />

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Email</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Role</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Orgs</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Joined</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {filtered.map((user) => (
              <tr key={user.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium text-zinc-900">{user.name}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {user.email}
                  {user.emailVerified ? (
                    <span className="ml-2 text-xs text-green-600">verified</span>
                  ) : (
                    <span className="ml-2 text-xs text-amber-600">unverified</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {user.role === 'admin' ? (
                    <span className="inline-flex items-center rounded-full bg-chicago-navy/10 px-2 py-0.5 text-xs font-medium text-chicago-navy">
                      Admin
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">User</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-600">{user._count.memberships}</td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setResetTarget(user)
                        setTempPassword(null)
                        setError('')
                      }}
                      className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Reset password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTarget(user)
                        setError('')
                      }}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="mt-4 text-center text-sm text-zinc-500">No users found.</p>
      )}

      {/* Password reset modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-900">Reset password</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Reset the password for <strong>{resetTarget.email}</strong>. A temporary password will
              be generated - share it with the user. They should change it after their next login.
            </p>

            {tempPassword ? (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">Temporary password:</p>
                <p className="mt-1 font-mono text-lg font-bold text-green-900">{tempPassword}</p>
                <p className="mt-2 text-xs text-green-600">
                  Copy this now - it will not be shown again.
                </p>
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="mt-4 w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-chicago-red px-4 py-2 text-sm font-medium text-white hover:bg-chicago-red-dark disabled:opacity-50"
                >
                  {loading ? 'Resetting...' : 'Reset password'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-900">Delete user</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Are you sure you want to delete <strong>{deleteTarget.email}</strong>? This will
              remove their account, organization memberships, and voter roll entries. Ballots they
              cast are anonymous and will not be affected. Polls and elections they created will
              remain with the creator set to null.
            </p>
            <p className="mt-3 text-sm font-medium text-red-600">This action cannot be undone.</p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={loading}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete user'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
