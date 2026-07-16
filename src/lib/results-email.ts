import { sendResultsEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import type { OptionInput } from '@/lib/tally'
import { getMethod } from '@/lib/voting-methods'
import type { TallyResult } from '@/lib/voting-methods/types'

const PRIVACY_THRESHOLD = 10

function renderResultsHtml(result: TallyResult, options: OptionInput[]): string {
  const label = (id: string) => options.find((o) => o.id === id)?.label ?? id

  if (result.kind === 'rcv') {
    const winnerRound = result.rounds.find((r) => r.winner)
    const winnerLabel = winnerRound ? label(winnerRound.winner as string) : 'No winner'
    const roundsHtml = result.rounds
      .map((r) => {
        const votesHtml = r.votes
          .map(
            (v) =>
              `<tr><td style="padding:2px 8px;">${v.label}</td><td style="padding:2px 8px; text-align:right; font-family:monospace;">${v.count}</td></tr>`,
          )
          .join('')
        return `<h4 style="margin:12px 0 4px 0; font-size:14px;">Round ${r.round}${r.winner ? ' - Winner found' : ''}</h4><table style="border-collapse:collapse; font-size:13px; color:#4a4a4a;">${votesHtml}</table>`
      })
      .join('')
    return `<p style="color:#16a34a; font-weight:600; margin:8px 0;">Winner: ${winnerLabel}</p>${roundsHtml}`
  }

  if (result.kind === 'stv') {
    const elected = result.rounds.flatMap((r) => r.elected)
    const electedLabels = elected.map(label).join(', ')
    const roundsHtml = result.rounds
      .map((r) => {
        const votesHtml = r.votes
          .map(
            (v) =>
              `<tr><td style="padding:2px 8px;">${v.label}</td><td style="padding:2px 8px; text-align:right; font-family:monospace;">${v.count}</td></tr>`,
          )
          .join('')
        return `<h4 style="margin:12px 0 4px 0; font-size:14px;">Round ${r.round}${r.elected.length > 0 ? ` - Elected: ${r.elected.map(label).join(', ')}` : ''}</h4><p style="font-size:12px; color:#9ca3af; margin:2px 0;">Quota: ${r.quota}</p><table style="border-collapse:collapse; font-size:13px; color:#4a4a4a;">${votesHtml}</table>`
      })
      .join('')
    return `<p style="color:#16a34a; font-weight:600; margin:8px 0;">Elected: ${electedLabels || 'none'}</p>${roundsHtml}`
  }

  if (result.kind === 'approval') {
    const winners = result.result.elected.map(label).join(', ')
    const votesHtml = result.result.votes
      .map(
        (v) =>
          `<tr><td style="padding:2px 8px;">${v.label}</td><td style="padding:2px 8px; text-align:right; font-family:monospace;">${v.count}</td></tr>`,
      )
      .join('')
    return `<p style="color:#16a34a; font-weight:600; margin:8px 0;">Winners: ${winners}</p><table style="border-collapse:collapse; font-size:13px; color:#4a4a4a;">${votesHtml}</table>`
  }

  // yesno
  const votesHtml = result.result.votes
    .map(
      (v) =>
        `<tr><td style="padding:2px 8px;">${v.label}</td><td style="padding:2px 8px; color:${v.passed ? '#16a34a' : '#dc2626'}; font-weight:600;">${v.passed ? 'PASSED' : 'FAILED'}</td><td style="padding:2px 8px; text-align:right; font-family:monospace;">Yes: ${v.yesCount} / No: ${v.noCount}</td></tr>`,
    )
    .join('')
  return `<table style="border-collapse:collapse; font-size:13px; color:#4a4a4a;">${votesHtml}</table>`
}

/**
 * Send results emails to all opted-in voters who cast a ballot in a standalone
 * poll. Best-effort: a failed email for one recipient never blocks others or
 * rolls back the poll close. Mirrors the sendVoteConfirmation secrecy rule:
 * the recipient↔ballot pairing is never persisted or logged.
 *
 * Called from both the manual close (PATCH route) and auto-close (ballot route).
 */
export async function sendPollResultsEmails(pollId: string, pollSlug: string, pollTitle: string) {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      options: true,
      ballots: { select: { rankings: true } },
    },
  })
  if (!poll) return

  const ballotCount = poll.ballots.length
  const rolls = await prisma.voterRoll.findMany({
    where: { pollId, hasVoted: true, wantsResultsEmail: true },
    include: { user: { select: { email: true } } },
  })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const resultsLink = `${baseUrl}/polls/${pollSlug}/results`

  const options = poll.options as OptionInput[]
  const result = getMethod(poll.votingMethod).tally(options, poll.ballots, {
    seats: poll.seats,
    threshold: poll.threshold,
  })

  const resultsHtml = ballotCount >= PRIVACY_THRESHOLD ? renderResultsHtml(result, options) : null

  for (const roll of rolls) {
    if (!roll.user?.email) continue
    try {
      await sendResultsEmail({
        to: roll.user.email,
        title: pollTitle,
        resultsLink,
        resultsHtml,
      })
    } catch {
      // Best-effort. Deliberately do not log recipient or ballot info.
      console.error('Results email failed to send for a poll')
    }
  }
}

/**
 * Send results emails to all opted-in voters who cast a ballot in an election.
 * Renders a per-contest results summary. Best-effort, same secrecy rules as
 * sendPollResultsEmails.
 */
export async function sendElectionResultsEmails(
  electionId: string,
  electionSlug: string,
  electionTitle: string,
) {
  const election = await prisma.election.findUnique({
    where: { id: electionId },
    include: {
      contests: {
        orderBy: { contestOrder: 'asc' },
        include: {
          options: true,
          ballots: { select: { rankings: true } },
        },
      },
    },
  })
  if (!election) return

  const rolls = await prisma.electionVoterRoll.findMany({
    where: { electionId, hasVoted: true, wantsResultsEmail: true },
    include: { user: { select: { email: true } } },
  })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const resultsLink = `${baseUrl}/elections/${electionSlug}/results`

  // Build results HTML per contest; suppress per-contest details below the
  // privacy threshold so small electorates don't leak individual votes.
  const contestResultsHtml = election.contests
    .map((contest) => {
      const ballotCount = contest.ballots.length
      const options = contest.options as OptionInput[]
      const result = getMethod(contest.votingMethod).tally(options, contest.ballots, {
        seats: contest.seats,
        threshold: contest.threshold,
      })

      const html = ballotCount >= PRIVACY_THRESHOLD ? renderResultsHtml(result, options) : null

      const suppressionNote = `<p style="color:#9ca3af; font-size:12px; margin:4px 0;">Per-ballot details are withheld for small-electorate privacy.</p>`

      return `<div style="margin-bottom:24px;"><h3 style="color:#1a1a1a; font-size:16px; margin:0 0 4px 0;">${contest.title}</h3>${html ?? suppressionNote}</div>`
    })
    .join('')

  // For elections, send full contest HTML. The per-contest suppression is
  // handled above (each contest checks its own ballotCount).
  const resultsHtml = `<h2 style="color:#1a1a1a; font-size:18px; margin:0 0 12px 0;">Results</h2>${contestResultsHtml}`

  for (const roll of rolls) {
    if (!roll.user?.email) continue
    try {
      await sendResultsEmail({
        to: roll.user.email,
        title: electionTitle,
        resultsLink,
        resultsHtml,
      })
    } catch {
      console.error('Results email failed to send for an election')
    }
  }
}
