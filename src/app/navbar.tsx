import Link from 'next/link'
import AuthStatus from './auth-status'

export default function Navbar() {
  return (
    <nav className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          clearvote
        </Link>
        <AuthStatus />
      </div>
    </nav>
  )
}
