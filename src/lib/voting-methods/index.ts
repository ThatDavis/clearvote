import { rcv } from './rcv'
import { stv } from './stv'
import { approval } from './approval'
import { yesno } from './yesno'
import type { VotingMethodDef } from './types'

export const VOTING_METHODS = { rcv, stv, approval, yesno } as const
export type VotingMethodId = keyof typeof VOTING_METHODS

export const ALL_METHODS: VotingMethodDef[] = Object.values(VOTING_METHODS)

/** Never throw on bad data - fall back to rcv, matching today's `else` default. */
export const getMethod = (id: string): VotingMethodDef =>
  (VOTING_METHODS as Record<string, VotingMethodDef>)[id] ?? VOTING_METHODS.rcv

export { type VotingMethodDef, type TallyResult, type ContestBallotProps } from './types'
