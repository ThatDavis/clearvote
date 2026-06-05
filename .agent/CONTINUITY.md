# CONTINUITY — clearvote

> Canonical project briefing. Read at session start.
> Stack: TypeScript + Next.js + PostgreSQL
> Type: Web app (full-stack)

## [PLANS]

### Milestone 1: Core Voting Engine (Completed 2026-06-04)
Goal: Anonymous polls with ranked-choice voting and instant-runoff tally.

Dependency order: Poll → Status → Tokens → Voting → Tally → Results → Receipts

#### Phase A: Foundation
- [x] A1: Extend Prisma schema — add VoterToken model, add receiptCode to Ballot
- [x] A2: Create Poll — form at /polls/new, API POST /api/polls, slug generation
- [x] A3: Poll Status Lifecycle — API PATCH /api/polls/[id]/status (draft→open→closed)
- [x] A4: RCV Tally Algorithm — pure function tallyRcv() + comprehensive unit tests (10 tests)

#### Phase B: Voting Flow
- [x] B1: Voter Token Generation — API POST /api/polls/[id]/tokens, admin UI
- [x] B2: Cast Vote — token validation page, drag-and-drop ranking UI (@dnd-kit), API POST /api/ballots

#### Phase C: Results & Verification
- [x] C1: Public Results Page — /polls/[slug]/results, round-by-round breakdown, anonymized ballots
- [x] C2: Vote Receipts — sha256 receipt code on ballot submission, verification page /verify

### Future Milestones
- Milestone 3 — Vote & Voter Management: dashboards, multi-winner STV, deadlines, proxy voting

### Milestone 2: Auth & Voter Integrity (In Progress)
Goal: User accounts, authenticated voting, one-vote-per-person enforcement, voter roll management.

Approach: Auth.js v5 (JWT strategy, credentials provider), bcryptjs. JWT sessions — no database session tables.

#### Phase A: Auth Foundation
- [ ] A1: Add User model, add creatorId to Poll, install next-auth + bcryptjs
- [ ] A2: Auth.js config (src/auth.ts), middleware, API route handler
- [ ] A3: Signup + login pages, session display in layout

#### Phase B: Auth-Gated Poll Management
- [ ] B1: Protect poll creation (POST /api/polls) behind auth, set creatorId
- [ ] B2: Restrict poll management (status, tokens) to poll creator

#### Phase C: Voter Rolls & Authenticated Voting
- [ ] C1: Update VoterRoll to use userId, add voter roll management UI
- [ ] C2: Add userId to Ballot (optional), auth-gated ballot submission
- [ ] C3: Enforce one-vote-per-person for authenticated votes

#### Phase D: Dashboard
- [ ] D1: User dashboard — polls I created + polls I can vote on

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
| 2026-06-04 | M1 complete: poll creation, status lifecycle, RCV tally (10 tests), voter token generation, drag-and-drop voting, results page, vote receipts. |

## [DISCOVERIES]

- Prisma 7 requires an explicit database adapter (`@prisma/adapter-pg` for PostgreSQL). The old `new PrismaClient()` no-arg constructor is gone.
- @dnd-kit works well for accessible drag-and-drop ranking with keyboard support.

## [OUTCOMES]

- M1 (2026-06-04): Core Voting Engine delivered — poll CRUD, status lifecycle, voter token system, drag-and-drop voting, RCV instant-runoff tally (10 unit tests), public results with anonymized ballots, vote receipt verification. PR: #1.
