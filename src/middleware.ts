import { NextResponse } from 'next/server'
import { auth } from '@/auth'

export default auth((req) => {
  const { pathname } = req.nextUrl

  const protectedPaths = ['/polls/new', '/dashboard']

  if (protectedPaths.some((p) => pathname.startsWith(p)) && !req.auth) {
    const signInUrl = new URL('/login', req.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
