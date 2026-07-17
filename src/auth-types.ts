import type { DefaultSession } from 'next-auth'
import type { DefaultJWT } from 'next-auth/jwt'

interface Membership {
  organizationId: string
  organizationName: string
  organizationSlug: string
  role: string
}

declare module 'next-auth' {
  interface User {
    role: string | null
    memberships: Membership[]
  }

  interface Session {
    user: {
      id: string
      role: string | null
      memberships: Membership[]
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    role: string | null
    memberships: Membership[]
  }
}
