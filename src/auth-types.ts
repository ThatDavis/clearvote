import type { DefaultSession } from 'next-auth'
import type { DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    organizationId: string | null
    organizationName: string | null
  }

  interface Session {
    user: {
      id: string
      organizationId: string | null
      organizationName: string | null
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    organizationId: string | null
    organizationName: string | null
  }
}
