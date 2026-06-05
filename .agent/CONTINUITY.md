# CONTINUITY — clearvote

> Canonical project briefing. Read at session start.
> Stack: TypeScript + Next.js + PostgreSQL
> Type: Web app (full-stack)

## [PLANS]

### Milestone 1: Core Voting Engine (In Progress)
Goal: Anonymous polls with ranked-choice voting and instant-runoff tally.

Dependency order: Poll → Status → Tokens → Voting → Tally → Results → Receipts

#### Phase A: Foundation
- [ ] A1: Extend Prisma schema — add VoterToken model, add receiptCode to Ballot
- [ ] A2: Create Poll — form at /polls/new, API POST /api/polls, slug generation
- [ ] A3: Poll Status Lifecycle — API PATCH /api/polls/[id]/status (draft→open→closed)
- [ ] A4: RCV Tally Algorithm — pure function tallyRcv() + comprehensive unit tests

#### Phase B: Voting Flow
- [ ] B1: Voter Token Generation — API POST /api/polls/[id]/tokens, admin UI
- [ ] B2: Cast Vote — token validation page, drag-and-drop ranking UI, API POST /api/ballots

#### Phase C: Results & Verification
- [ ] C1: Public Results Page — /polls/[slug]/results, round-by-round breakdown, anonymized ballots
- [ ] C2: Vote Receipts — sha256 receipt code on ballot submission, verification page /verify

### Future Milestones
- Milestone 2 — Auth & Voter Integrity: user accounts, authenticated voting, one-vote-per-person
- Milestone 3 — Vote & Voter Management: dashboards, multi-winner STV, deadlines, proxy voting

### Open Questions
- [ ] Should we support "equal ranking" where a voter gives two candidates the same rank?
- [ ] Should full anonymized ballot data be published for public audit?

## [DECISIONS]

- 2026-06-04: Initial stack — TypeScript + Next.js + PostgreSQL + Prisma + Tailwind + Vitest + Biome. Rationale: full-stack in one language, RDBMS for ballot integrity, mature ecosystem.
- 2026-06-04: Deep-plan validated scaffold. Planned features: anonymous polls with RCV (M1), auth + voter integrity (M2), dashboards + STV (M3). Added auditability, multi-winner STV, vote receipts, timed polls, and proxy voting to roadmap.

## [PROGRESS]

| Date | What was done |
|------|---------------|
| 2026-06-04 | Initial scaffold. Stack: TypeScript + Next.js + PostgreSQL + Prisma + Tailwind + Vitest + Biome + Docker Compose. |

## [DISCOVERIES]

*None yet.*

## [OUTCOMES]

*None yet.*
