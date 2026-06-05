'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'

export default function AuthStatus() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div className="h-5 w-20 animate-pulse rounded bg-zinc-100" />
  }

  if (session) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <Link href="/dashboard" className="text-zinc-600 hover:text-zinc-900">
          {session.user?.name}
        </Link>
        <Link href="/api/auth/signout" className="text-zinc-400 hover:text-zinc-600">
          Log out
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <Link href="/login" className="text-zinc-600 hover:text-zinc-900">
        Log in
      </Link>
      <Link
        href="/signup"
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-800"
      >
        Sign up
      </Link>
    </div>
  )
}
