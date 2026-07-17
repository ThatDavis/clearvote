import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

// Mock bcryptjs hash
vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashed-password'),
  default: { hash: vi.fn().mockResolvedValue('hashed-password') },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

function mockAuthAsAdmin(userId: string) {
  vi.mocked(auth).mockResolvedValue({
    user: { id: userId, role: 'admin' },
  } as never)
}

function mockAuthAsRegular(userId: string) {
  vi.mocked(auth).mockResolvedValue({
    user: { id: userId, role: null },
  } as never)
}

function mockAuthAsNone() {
  vi.mocked(auth).mockResolvedValue(null as never)
}

describe('DELETE /api/admin/users/[userId]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuthAsNone()
    const { DELETE } = await import('@/app/api/admin/users/[userId]/route')
    const res = await DELETE(new Request('http://localhost'), {
      params: Promise.resolve({ userId: 'target-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not a system admin', async () => {
    mockAuthAsRegular('user-1')
    const { DELETE } = await import('@/app/api/admin/users/[userId]/route')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: null } as never)
    const res = await DELETE(new Request('http://localhost'), {
      params: Promise.resolve({ userId: 'target-1' }),
    })
    expect(res.status).toBe(403)
  })

  it('returns 400 when trying to delete self', async () => {
    mockAuthAsAdmin('admin-1')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'admin' } as never)
    const { DELETE } = await import('@/app/api/admin/users/[userId]/route')
    const res = await DELETE(new Request('http://localhost'), {
      params: Promise.resolve({ userId: 'admin-1' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 404 when user not found', async () => {
    mockAuthAsAdmin('admin-1')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'admin' } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ role: 'admin' } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)
    const { DELETE } = await import('@/app/api/admin/users/[userId]/route')
    const res = await DELETE(new Request('http://localhost'), {
      params: Promise.resolve({ userId: 'nonexistent' }),
    })
    expect(res.status).toBe(404)
  })

  it('deletes the user and returns success', async () => {
    mockAuthAsAdmin('admin-1')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'admin' } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ role: 'admin' } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'target-1',
      email: 'target@test.com',
    } as never)
    vi.mocked(prisma.user.delete).mockResolvedValue({} as never)
    const { DELETE } = await import('@/app/api/admin/users/[userId]/route')
    const res = await DELETE(new Request('http://localhost'), {
      params: Promise.resolve({ userId: 'target-1' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'target-1' } })
  })
})

describe('POST /api/admin/users/[userId]/password-reset', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuthAsNone()
    const { POST } = await import('@/app/api/admin/users/[userId]/password-reset/route')
    const res = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ userId: 'target-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not a system admin', async () => {
    mockAuthAsRegular('user-1')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: null } as never)
    const { POST } = await import('@/app/api/admin/users/[userId]/password-reset/route')
    const res = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ userId: 'target-1' }),
    })
    expect(res.status).toBe(403)
  })

  it('returns 404 when target user not found', async () => {
    mockAuthAsAdmin('admin-1')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'admin' } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ role: 'admin' } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)
    const { POST } = await import('@/app/api/admin/users/[userId]/password-reset/route')
    const res = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ userId: 'nonexistent' }),
    })
    expect(res.status).toBe(404)
  })

  it('generates a temp password and hashes it', async () => {
    mockAuthAsAdmin('admin-1')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'admin' } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ role: 'admin' } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'target-1',
      email: 'target@test.com',
    } as never)
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)

    const { POST } = await import('@/app/api/admin/users/[userId]/password-reset/route')
    const res = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ userId: 'target-1' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.tempPassword).toBeDefined()
    expect(typeof data.tempPassword).toBe('string')
    expect(data.tempPassword.length).toBeGreaterThan(8)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'target-1' },
      data: { passwordHash: 'hashed-password' },
    })
  })
})
