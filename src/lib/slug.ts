import { prisma } from '@/lib/prisma'

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'poll'
  )
}

export async function uniqueSlug(text: string): Promise<string> {
  const base = slugify(text)
  let slug = base
  let suffix = 1

  while (await prisma.poll.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix}`
    suffix++
  }

  return slug
}
