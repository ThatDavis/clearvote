import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const org = await prisma.organization.findUnique({ where: { slug } })
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  if (session?.user?.organizationId !== org.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = await request.json()
  const { email } = body as { email?: string }

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  })

  if (!user) {
    return NextResponse.json({ error: 'No user found with that email' }, { status: 404 })
  }

  if (user.organizationId) {
    return NextResponse.json(
      { error: 'This user is already a member of an organization' },
      { status: 409 },
    )
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { organizationId: org.id },
  })

  return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const org = await prisma.organization.findUnique({ where: { slug } })
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  if (session?.user?.organizationId !== org.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = await request.json()
  const { userId } = body as { userId?: string }

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  if (userId === session.user.id) {
    return NextResponse.json(
      { error: 'You cannot remove yourself from the organization' },
      { status: 400 },
    )
  }

  await prisma.user.update({
    where: { id: userId },
    data: { organizationId: null },
  })

  return NextResponse.json({ success: true })
}
