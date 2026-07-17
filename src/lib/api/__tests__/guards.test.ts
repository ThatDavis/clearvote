import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    organizationMember: {
      findUnique: vi.fn(),
    },
  },
}))

import { requireOrgAdmin, requireSystemAdmin } from '@/lib/api/guards'
import { prisma } from '@/lib/prisma'

describe('requireSystemAdmin', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns true when user has role admin', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'admin' } as never)
    const result = await requireSystemAdmin('user-1')
    expect(result).toBe(true)
  })

  it('returns false when user has role null', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: null } as never)
    const result = await requireSystemAdmin('user-1')
    expect(result).toBe(false)
  })

  it('returns false when user does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const result = await requireSystemAdmin('nonexistent')
    expect(result).toBe(false)
  })

  it('queries by userId and selects only role', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: null } as never)
    await requireSystemAdmin('user-1')
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { role: true },
    })
  })
})

describe('requireOrgAdmin (unchanged)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns true when membership role is admin', async () => {
    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
      role: 'admin',
    } as never)
    const result = await requireOrgAdmin('org-1', 'user-1')
    expect(result).toBe(true)
  })

  it('returns false when membership role is member', async () => {
    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue({
      role: 'member',
    } as never)
    const result = await requireOrgAdmin('org-1', 'user-1')
    expect(result).toBe(false)
  })

  it('returns false when no membership exists', async () => {
    vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue(null)
    const result = await requireOrgAdmin('org-1', 'user-1')
    expect(result).toBe(false)
  })
})
