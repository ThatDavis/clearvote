import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { uniqueSlug } from '@/lib/slug'

export default async function CreateOrgPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  async function createOrg(formData: FormData) {
    'use server'

    const userId = session?.user.id
    if (!userId) {
      return redirect('/login')
    }

    const name = (formData.get('name') as string).trim()
    const description = (formData.get('description') as string)?.trim() || null
    if (!name) {
      return redirect('/orgs/new?error=Organization name is required')
    }

    const slug = await uniqueSlug(name)

    await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name, description, slug },
      })

      await tx.organizationMember.create({
        data: {
          userId,
          organizationId: org.id,
          role: 'admin',
        },
      })
    })

    redirect(`/org/${slug}`)
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8 sm:py-24">
      <h1 className="text-2xl font-semibold tracking-tight">Create an organization</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Organizations let you run polls with your community, co-op, or team.
      </p>

      <form action={createOrg} className="mt-8 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Organization name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Your co-op, HOA, or union name"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium">
            Description
            <span className="ml-1 text-zinc-400">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="What does your organization do?"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-chicago-red px-4 py-2.5 text-sm font-medium text-white hover:bg-chicago-red-dark"
        >
          Create organization
        </button>
      </form>
    </div>
  )
}
