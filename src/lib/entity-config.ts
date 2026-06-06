export type EntityKind = 'poll' | 'election'

export interface EntityConfig {
  kind: EntityKind
  apiBase: string
  voteBase: string
  noun: string
  Noun: string
}

export const POLL_CONFIG: EntityConfig = {
  kind: 'poll',
  apiBase: '/api/polls',
  voteBase: '/vote',
  noun: 'poll',
  Noun: 'Poll',
}

export const ELECTION_CONFIG: EntityConfig = {
  kind: 'election',
  apiBase: '/api/elections',
  voteBase: '/elect',
  noun: 'election',
  Noun: 'Election',
}
