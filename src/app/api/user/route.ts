import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name } = body as { name?: string }

  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  if (name.length > 100) {
    return NextResponse.json({ error: 'Name must be less than 100 characters' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: name.trim() },
  })

  return NextResponse.json({ success: true })
}
