import Link from 'next/link'
import AuthStatus from './auth-status'

export default function Navbar() {
  return (
    <nav className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-bold tracking-tight text-chicago-navy transition-colors hover:text-chicago-red"
        >
          <svg
            aria-hidden="true"
            className="h-6 w-6 text-chicago-red"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          clearvote
        </Link>
        <AuthStatus />
      </div>
    </nav>
  )
}
