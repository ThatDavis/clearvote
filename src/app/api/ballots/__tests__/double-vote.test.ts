import { describe, expect, it, vi } from 'vitest'

const mockUpdateMany = vi.fn()
const mockBallotCreate = vi.fn()
const mockAuditCreate = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    poll: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    voterToken: {
      findUnique: vi.fn(),
      updateMany: mockUpdateMany,
    },
    voterRoll: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    ballot: {
      create: mockBallotCreate,
    },
    auditLog: {
      create: mockAuditCreate,
    },
    $transaction: vi.fn((callback: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        voterToken: { updateMany: mockUpdateMany },
        voterRoll: { updateMany: vi.fn() },
        ballot: { create: mockBallotCreate },
        auditLog: { create: mockAuditCreate },
      }
      return callback(tx)
    }),
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({ success: true, resetAt: Date.now() + 60000 })),
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}))

describe('POST /api/ballots', () => {
  it('returns 409 when token is claimed concurrently (double-vote race)', async () => {
    const { prisma } = await import('@/lib/prisma')
    const { POST } = await import('@/app/api/ballots/route')

    const pollId = 'poll-123'
    const tokenHash = 'hashed-token'
    const optionId = 'opt-1'

    // Mock poll lookup
    vi.mocked(prisma.poll.findUnique).mockResolvedValue({
      id: pollId,
      slug: 'test-poll',
      title: 'Test Poll',
      description: null,
      status: 'open',
      seats: 1,
      votingMethod: 'rcv',
      threshold: 50,
      creatorId: null,
      organizationId: null,
      startsAt: null,
      endsAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      options: [{ id: optionId, label: 'Option A' }],
    } as unknown as Awaited<ReturnType<typeof prisma.poll.findUnique>>)

    // Mock token lookup (exists and unused)
    vi.mocked(prisma.voterToken.findUnique).mockResolvedValue({
      id: 'vt-1',
      pollId,
      tokenHash,
      usedAt: null,
      createdAt: new Date(),
    } as unknown as Awaited<ReturnType<typeof prisma.voterToken.findUnique>>)

    // Simulate first call claiming the token, second call finding it already claimed
    let callCount = 0
    mockUpdateMany.mockImplementation(() => {
      callCount++
      return Promise.resolve({ count: callCount === 1 ? 1 : 0 })
    })

    mockBallotCreate.mockResolvedValue({
      id: 'ballot-1',
      pollId,
      receiptCode: 'receipt-123',
      castAt: new Date(),
    })

    mockAuditCreate.mockResolvedValue({ id: 'audit-1' })

    // First request should succeed
    const req1 = new Request('http://localhost/api/ballots', {
      method: 'POST',
      body: JSON.stringify({
        pollSlug: 'test-poll',
        token: 'raw-token',
        rankings: [optionId],
      }),
    })
    const res1 = await POST(req1)
    expect(res1.status).toBe(201)

    // Second request should fail with 409
    const req2 = new Request('http://localhost/api/ballots', {
      method: 'POST',
      body: JSON.stringify({
        pollSlug: 'test-poll',
        token: 'raw-token',
        rankings: [optionId],
      }),
    })
    const res2 = await POST(req2)
    expect(res2.status).toBe(409)
    const body2 = await res2.json()
    expect(body2.error).toBe('You have already voted in this poll')

    // Ballot should only be created once
    expect(mockBallotCreate).toHaveBeenCalledTimes(1)
  })
})
