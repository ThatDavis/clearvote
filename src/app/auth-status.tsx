'use client'

import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'

export default function AuthStatus() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div className="h-5 w-20 animate-pulse rounded-lg bg-zinc-100" />
  }

  if (session) {
    const memberships = session.user.memberships || []
    return (
      <div className="flex items-center gap-4 text-sm">
        {memberships.length > 0 && (
          <div className="relative group hidden sm:block">
            <button
              type="button"
              className="flex items-center gap-1 text-zinc-500 transition-colors hover:text-chicago-blue"
            >
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              Orgs
              <svg
                aria-hidden="true"
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div className="absolute right-0 top-full hidden w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg group-hover:block">
              {memberships.map((m) => (
                <Link
                  key={m.organizationId}
                  href={`/org/${m.organizationSlug}`}
                  className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  {m.organizationName}
                  {m.role === 'admin' && (
                    <span className="ml-1 text-xs text-chicago-blue">(admin)</span>
                  )}
                </Link>
              ))}
              <div className="my-1 border-t border-zinc-200" />
              <Link
                href="/orgs/new"
                className="block px-4 py-2 text-sm text-chicago-red hover:bg-zinc-50"
              >
                + Create organization
              </Link>
            </div>
          </div>
        )}
        <div className="relative group">
          <button
            type="button"
            className="flex items-center gap-1 text-zinc-600 transition-colors hover:text-chicago-navy font-medium"
          >
            {session.user?.name}
            <svg
              aria-hidden="true"
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <div className="absolute right-0 top-full hidden w-40 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg group-hover:block pt-2 -mt-1">
            <Link
              href="/dashboard"
              className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Dashboard
            </Link>
            {session.user?.role === 'admin' && (
              <Link
                href="/admin"
                className="block px-4 py-2 text-sm font-medium text-chicago-navy hover:bg-zinc-50"
              >
                Admin
              </Link>
            )}
            <Link
              href="/settings"
              className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Settings
            </Link>
            <div className="my-1 border-t border-zinc-200" />
            <button
              type="button"
              onClick={async () => {
                await signOut({ redirect: false })
                window.location.href = '/'
              }}
              className="block w-full px-4 py-2 text-left text-sm text-zinc-500 hover:bg-zinc-50"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link
        href="/login"
        className="text-zinc-600 transition-colors hover:text-chicago-navy font-medium"
      >
        Log in
      </Link>
      <Link
        href="/signup"
        className="rounded-lg bg-chicago-red px-4 py-2 text-white font-medium transition-all hover:bg-chicago-red-dark hover:shadow-md"
      >
        Sign up
      </Link>
    </div>
  )
}
