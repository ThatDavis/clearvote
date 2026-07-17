import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OptionInput } from '@/lib/tally'

const opts = (ids: string[]): OptionInput[] => ids.map((id) => ({ id, label: id.toUpperCase() }))

// Mock prisma so we can test the close→email flow without a DB.
vi.mock('@/lib/prisma', () => ({
  prisma: {
    poll: {
      findUnique: vi.fn(),
    },
    election: {
      findUnique: vi.fn(),
    },
    voterRoll: {
      findMany: vi.fn(),
    },
    electionVoterRoll: {
      findMany: vi.fn(),
    },
  },
}))

// Mock the email sender so we can assert calls.
vi.mock('@/lib/email', () => ({
  sendResultsEmail: vi.fn().mockResolvedValue({ success: true }),
}))

import { sendResultsEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { sendElectionResultsEmails, sendPollResultsEmails } from '@/lib/results-email'

describe('sendPollResultsEmails', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does nothing if the poll is not found', async () => {
    vi.mocked(prisma.poll.findUnique).mockResolvedValue(null)
    await sendPollResultsEmails('p1', 'my-poll', 'My Poll')
    expect(sendResultsEmail).not.toHaveBeenCalled()
  })

  it('sends full results when ballotCount >= 10', async () => {
    vi.mocked(prisma.poll.findUnique).mockResolvedValue({
      id: 'p1',
      title: 'My Poll',
      slug: 'my-poll',
      votingMethod: 'rcv',
      seats: 1,
      threshold: 50,
      options: opts(['a', 'b']),
      ballots: Array(10).fill({ rankings: ['a'] }),
    } as never)
    vi.mocked(prisma.voterRoll.findMany).mockResolvedValue([
      { user: { email: 'voter@test.com' } },
    ] as never)

    await sendPollResultsEmails('p1', 'my-poll', 'My Poll')

    expect(sendResultsEmail).toHaveBeenCalledOnce()
    const call = vi.mocked(sendResultsEmail).mock.calls[0]?.[0]
    expect(call?.to).toBe('voter@test.com')
    expect(call?.resultsLink).toContain('/polls/my-poll/results')
    expect(call?.resultsHtml).not.toBeNull()
    expect(call?.resultsHtml).toContain('Winner')
  })

  it('sends link-only when ballotCount < 10 (privacy suppression)', async () => {
    vi.mocked(prisma.poll.findUnique).mockResolvedValue({
      id: 'p1',
      title: 'Small Poll',
      slug: 'small-poll',
      votingMethod: 'approval',
      seats: 1,
      threshold: 50,
      options: opts(['a', 'b']),
      ballots: [{ rankings: ['a'] }, { rankings: ['b'] }],
    } as never)
    vi.mocked(prisma.voterRoll.findMany).mockResolvedValue([
      { user: { email: 'voter@test.com' } },
    ] as never)

    await sendPollResultsEmails('p1', 'small-poll', 'Small Poll')

    expect(sendResultsEmail).toHaveBeenCalledOnce()
    const call = vi.mocked(sendResultsEmail).mock.calls[0][0]
    expect(call.resultsHtml).toBeNull()
  })

  it('skips rolls without an email', async () => {
    vi.mocked(prisma.poll.findUnique).mockResolvedValue({
      id: 'p1',
      title: 'P',
      slug: 'p',
      votingMethod: 'rcv',
      seats: 1,
      threshold: 50,
      options: opts(['a', 'b']),
      ballots: Array(10).fill({ rankings: ['a'] }),
    } as never)
    vi.mocked(prisma.voterRoll.findMany).mockResolvedValue([
      { user: { email: null } },
      { user: { email: 'ok@test.com' } },
    ] as never)

    await sendPollResultsEmails('p1', 'p', 'P')

    expect(sendResultsEmail).toHaveBeenCalledOnce()
    expect(vi.mocked(sendResultsEmail).mock.calls[0][0].to).toBe('ok@test.com')
  })

  it('sends to multiple opted-in voters', async () => {
    vi.mocked(prisma.poll.findUnique).mockResolvedValue({
      id: 'p1',
      title: 'P',
      slug: 'p',
      votingMethod: 'rcv',
      seats: 1,
      threshold: 50,
      options: opts(['a', 'b']),
      ballots: Array(12).fill({ rankings: ['a'] }),
    } as never)
    vi.mocked(prisma.voterRoll.findMany).mockResolvedValue([
      { user: { email: 'a@test.com' } },
      { user: { email: 'b@test.com' } },
      { user: { email: 'c@test.com' } },
    ] as never)

    await sendPollResultsEmails('p1', 'p', 'P')

    expect(sendResultsEmail).toHaveBeenCalledTimes(3)
  })

  it('queries only hasVoted=true and wantsResultsEmail=true rolls', async () => {
    vi.mocked(prisma.poll.findUnique).mockResolvedValue({
      id: 'p1',
      title: 'P',
      slug: 'p',
      votingMethod: 'rcv',
      seats: 1,
      threshold: 50,
      options: opts(['a', 'b']),
      ballots: Array(10).fill({ rankings: ['a'] }),
    } as never)
    vi.mocked(prisma.voterRoll.findMany).mockResolvedValue([])

    await sendPollResultsEmails('p1', 'p', 'P')

    const findManyCall = vi.mocked(prisma.voterRoll.findMany).mock.calls[0]?.[0]
    expect(findManyCall?.where).toEqual({
      pollId: 'p1',
      hasVoted: true,
      wantsResultsEmail: true,
    })
  })
})

describe('sendElectionResultsEmails', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does nothing if the election is not found', async () => {
    vi.mocked(prisma.election.findUnique).mockResolvedValue(null)
    await sendElectionResultsEmails('e1', 'my-election', 'My Election')
    expect(sendResultsEmail).not.toHaveBeenCalled()
  })

  it('sends per-contest results with suppression below threshold', async () => {
    vi.mocked(prisma.election.findUnique).mockResolvedValue({
      id: 'e1',
      title: 'My Election',
      slug: 'my-election',
      contests: [
        {
          id: 'c1',
          title: 'President',
          votingMethod: 'rcv',
          seats: 1,
          threshold: 50,
          options: opts(['a', 'b']),
          ballots: Array(12).fill({ rankings: ['a'] }),
        },
        {
          id: 'c2',
          title: 'Bylaw',
          votingMethod: 'yesno',
          seats: 1,
          threshold: 50,
          options: opts(['p1']),
          ballots: [{ rankings: { p1: 'yes' } }, { rankings: { p1: 'no' } }],
        },
      ],
    } as never)
    vi.mocked(prisma.electionVoterRoll.findMany).mockResolvedValue([
      { user: { email: 'voter@test.com' } },
    ] as never)

    await sendElectionResultsEmails('e1', 'my-election', 'My Election')

    const call = vi.mocked(sendResultsEmail).mock.calls[0][0]
    expect(call.to).toBe('voter@test.com')
    expect(call.resultsLink).toContain('/elections/my-election/results')
    // Full contest had 12 ballots -> results included
    expect(call.resultsHtml).toContain('President')
    expect(call.resultsHtml).toContain('Winner')
    // Small contest had 2 ballots -> suppression note
    expect(call.resultsHtml).toContain('small-electorate privacy')
  })
})
