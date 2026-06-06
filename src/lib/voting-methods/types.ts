import type { ComponentType } from 'react'
import type { ApprovalResult } from '@/lib/approval'
import type { StvRound } from '@/lib/stv'
import type { OptionInput, Round } from '@/lib/tally'
import type { YesNoResult } from '@/lib/yesno'

/** What the UI hands us as a raw vote before validation. */
export type RawBallot = string[] | Record<string, string>

/** Per-method config read off the Poll row. */
export interface MethodConfig {
  seats: number
  threshold: number
}

/** Discriminated union of every method's tally output. */
export type TallyResult =
  | { kind: 'rcv'; rounds: Round[] }
  | { kind: 'stv'; rounds: StvRound[] }
  | { kind: 'approval'; result: ApprovalResult }
  | { kind: 'yesno'; result: YesNoResult }

export interface ContestBallotProps {
  options: OptionInput[]
  value: RawBallot
  onChange: (next: RawBallot) => void
  disabled?: boolean
}

export interface VotingMethodDef {
  id: string
  label: string
  shortDesc: string
  fullDesc: string
  bestFor: string
  /** array of ids (ranking/approval) vs map of id->yes/no (yesno). */
  ballotShape: 'ranking' | 'map'
  /** minimum number of options a poll/contest of this method needs. */
  minOptions: number
  /** which config knobs this method exposes in forms. */
  uses: { seats: boolean; threshold: boolean }
  /** the empty/initial ballot value for the UI. */
  emptyBallot: () => RawBallot
  /** adapt the existing lib tally fn to a uniform signature. */
  tally: (options: OptionInput[], ballots: unknown[], cfg: MethodConfig) => TallyResult
  /** server-side validation of a raw submitted ballot. */
  validateBallot: (
    raw: unknown,
    options: OptionInput[],
  ) => { ok: true; value: RawBallot } | { ok: false; error: string }
  BallotComponent: ComponentType<ContestBallotProps>
}
