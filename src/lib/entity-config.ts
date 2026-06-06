export type EntityKind = 'poll' | 'election'

export interface EntityConfig {
  kind: EntityKind
  apiBase: (slug: string) => string
  voteBase: (slug: string) => string
  noun: string
  Noun: string
}

export const POLL_CONFIG: EntityConfig = {
  kind: 'poll',
  apiBase: (slug) => `/api/polls/${slug}`,
  voteBase: (slug) => `/vote/${slug}`,
  noun: 'poll',
  Noun: 'Poll',
}

export const ELECTION_CONFIG: EntityConfig = {
  kind: 'election',
  apiBase: (slug) => `/api/elections/${slug}`,
  voteBase: (slug) => `/elect/${slug}`,
  noun: 'election',
  Noun: 'Election',
}
