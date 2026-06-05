import { hash } from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { uniqueSlug } from '@/lib/slug'

import OrgNameToggle from './org-name-toggle'

export default function SignupPage() {
  async function signup(formData: FormData) {
    'use server'

    const email = (formData.get('email') as string).toLowerCase().trim()
    const name = (formData.get('name') as string).trim()
    const password = formData.get('password') as string
    const accountType = formData.get('accountType') as string
    const orgName = (formData.get('orgName') as string).trim()

    if (!email || !name || !password) {
      return redirect('/signup?error=All fields are required')
    }

    if (password.length < 8) {
      return redirect('/signup?error=Password must be at least 8 characters')
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return redirect('/signup?error=An account with this email already exists')
    }

    const passwordHash = await hash(password, 12)

    if (accountType === 'organization') {
      if (!orgName) {
        return redirect('/signup?error=Organization name is required')
      }

      const orgSlug = await uniqueSlug(orgName)

      await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: { name: orgName, slug: orgSlug },
        })

        await tx.user.create({
          data: { email, name, passwordHash, organizationId: org.id },
        })
      })
    } else {
      await prisma.user.create({
        data: { email, name, passwordHash },
      })
    }

    redirect('/login?registered=true')
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-32">
      <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>

      <form action={signup} className="mt-8 space-y-4">
        <fieldset>
          <legend className="block text-sm font-medium">Account type</legend>
          <div className="mt-2 flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="accountType" value="individual" defaultChecked />
              Individual
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="accountType" value="organization" />
              Organization
            </label>
          </div>
        </fieldset>

        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Your name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        <div id="orgNameField" className="hidden">
          <label htmlFor="orgName" className="block text-sm font-medium">
            Organization name
          </label>
          <input
            id="orgName"
            name="orgName"
            type="text"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            placeholder="Your co-op, HOA, or union name"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
          <p className="mt-1 text-xs text-zinc-400">At least 8 characters</p>
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Sign up
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <a href="/login" className="text-zinc-900 hover:underline">
          Log in
        </a>
      </p>

      <OrgNameToggle />
    </div>
  )
}
