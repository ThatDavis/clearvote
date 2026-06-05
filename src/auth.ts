import { compare } from 'bcryptjs'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Dynamic import to keep prisma out of edge runtime bundle (middleware)
        const { prisma } = await import('@/lib/prisma')

        const email = (credentials.email as string).toLowerCase().trim()
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email },
          include: { organization: { select: { name: true } } },
        })
        if (!user) return null

        const valid = await compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organizationId ?? null,
          organizationName: user.organization?.name ?? null,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.organizationId = (user as { organizationId?: string | null }).organizationId ?? null
        token.organizationName =
          (user as { organizationName?: string | null }).organizationName ?? null
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.organizationId = (token.organizationId as string) ?? null
        session.user.organizationName = (token.organizationName as string) ?? null
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
