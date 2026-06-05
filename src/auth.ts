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
          include: {
            memberships: {
              include: {
                organization: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        })
        if (!user) return null

        const valid = await compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          memberships: user.memberships.map((m) => ({
            organizationId: m.organization.id,
            organizationName: m.organization.name,
            organizationSlug: m.organization.slug,
            role: m.role,
          })),
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.memberships =
          (
            user as {
              memberships?: Array<{
                organizationId: string
                organizationName: string
                organizationSlug: string
                role: string
              }>
            }
          ).memberships ?? []
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.memberships =
          (token.memberships as Array<{
            organizationId: string
            organizationName: string
            organizationSlug: string
            role: string
          }>) ?? []
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  trustHost: true,
})
