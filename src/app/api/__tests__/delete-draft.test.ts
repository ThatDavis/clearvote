import { describe, expect, it, vi } from 'vitest'

const mockPollFindUnique = vi.fn()
const mockPollDelete = vi.fn()
const mockElectionFindUnique = vi.fn()
const mockElectionDelete = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    poll: {
      findUnique: mockPollFindUnique,
      delete: mockPollDelete,
    },
    election: {
      findUnique: mockElectionFindUnique,
      delete: mockElectionDelete,
    },
  },
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
    }),
  ),
}))

vi.mock('@/lib/auth', () => ({
  canManagePoll: vi.fn(() => Promise.resolve(true)),
}))

vi.mock('@/lib/election', () => ({
  canManageElection: vi.fn(() => Promise.resolve(true)),
}))

describe('DELETE /api/polls/[slug]', () => {
  it('deletes a draft poll', async () => {
    const { DELETE } = await import('@/app/api/polls/[slug]/route')

    mockPollFindUnique.mockResolvedValue({
      id: 'poll-123',
      slug: 'test-poll',
      status: 'draft',
      creatorId: 'user-123',
      organizationId: null,
    })
    mockPollDelete.mockResolvedValue({ id: 'poll-123' })

    const request = new Request('http://localhost/api/polls/test-poll')
    const res = await DELETE(request, { params: Promise.resolve({ slug: 'test-poll' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(mockPollDelete).toHaveBeenCalledWith({ where: { slug: 'test-poll' } })
  })

  it('returns 404 when poll not found', async () => {
    const { DELETE } = await import('@/app/api/polls/[slug]/route')

    mockPollFindUnique.mockResolvedValue(null)

    const request = new Request('http://localhost/api/polls/missing')
    const res = await DELETE(request, { params: Promise.resolve({ slug: 'missing' }) })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Poll not found')
  })

  it('returns 403 when user is not authorized', async () => {
    const { canManagePoll } = await import('@/lib/auth')
    vi.mocked(canManagePoll).mockResolvedValueOnce(false)

    const { DELETE } = await import('@/app/api/polls/[slug]/route')

    mockPollFindUnique.mockResolvedValue({
      id: 'poll-123',
      slug: 'test-poll',
      status: 'draft',
      creatorId: 'other-user',
      organizationId: null,
    })

    const request = new Request('http://localhost/api/polls/test-poll')
    const res = await DELETE(request, { params: Promise.resolve({ slug: 'test-poll' }) })

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Not authorized')
  })

  it('returns 400 when poll is not in draft status', async () => {
    const { DELETE } = await import('@/app/api/polls/[slug]/route')

    mockPollFindUnique.mockResolvedValue({
      id: 'poll-123',
      slug: 'test-poll',
      status: 'open',
      creatorId: 'user-123',
      organizationId: null,
    })

    const request = new Request('http://localhost/api/polls/test-poll')
    const res = await DELETE(request, { params: Promise.resolve({ slug: 'test-poll' }) })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Can only delete polls in draft status')
  })
})

describe('DELETE /api/elections/[slug]', () => {
  it('deletes a draft election', async () => {
    const { DELETE } = await import('@/app/api/elections/[slug]/route')

    mockElectionFindUnique.mockResolvedValue({
      id: 'election-123',
      slug: 'test-election',
      status: 'draft',
      creatorId: 'user-123',
      organizationId: null,
    })
    mockElectionDelete.mockResolvedValue({ id: 'election-123' })

    const request = new Request('http://localhost/api/elections/test-election')
    const res = await DELETE(request, { params: Promise.resolve({ slug: 'test-election' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(mockElectionDelete).toHaveBeenCalledWith({ where: { slug: 'test-election' } })
  })

  it('returns 404 when election not found', async () => {
    const { DELETE } = await import('@/app/api/elections/[slug]/route')

    mockElectionFindUnique.mockResolvedValue(null)

    const request = new Request('http://localhost/api/elections/missing')
    const res = await DELETE(request, { params: Promise.resolve({ slug: 'missing' }) })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Election not found')
  })

  it('returns 403 when user is not authorized', async () => {
    const { canManageElection } = await import('@/lib/election')
    vi.mocked(canManageElection).mockResolvedValueOnce(false)

    const { DELETE } = await import('@/app/api/elections/[slug]/route')

    mockElectionFindUnique.mockResolvedValue({
      id: 'election-123',
      slug: 'test-election',
      status: 'draft',
      creatorId: 'other-user',
      organizationId: null,
    })

    const request = new Request('http://localhost/api/elections/test-election')
    const res = await DELETE(request, { params: Promise.resolve({ slug: 'test-election' }) })

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Not authorized')
  })

  it('returns 400 when election is not in draft status', async () => {
    const { DELETE } = await import('@/app/api/elections/[slug]/route')

    mockElectionFindUnique.mockResolvedValue({
      id: 'election-123',
      slug: 'test-election',
      status: 'open',
      creatorId: 'user-123',
      organizationId: null,
    })

    const request = new Request('http://localhost/api/elections/test-election')
    const res = await DELETE(request, { params: Promise.resolve({ slug: 'test-election' }) })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Can only delete elections in draft status')
  })
})
