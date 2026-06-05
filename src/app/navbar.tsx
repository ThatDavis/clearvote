import Image from 'next/image'
import Link from 'next/link'
import AuthStatus from './auth-status'

export default function Navbar() {
  return (
    <nav className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center justify-between px-[10%] py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-bold tracking-tight text-chicago-navy transition-colors hover:text-chicago-red"
        >
          <Image src="/logo.svg" alt="clearvote" width={28} height={28} priority />
          clearvote
        </Link>
        <AuthStatus />
      </div>
    </nav>
  )
}
