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

### All Milestones Complete

### Milestone 3: Advanced Voting & Management (Completed 2026-06-04)
Goal: Multi-winner STV, approval voting, yes/no referendums, timed polls, enhanced dashboard, audit trail, proxy voting.

#### Phase A: Voting Methods
- [x] A1: Add `votingMethod` to Poll (rcv, stv, approval, yesno), update creation form
- [x] A2: STV tally algorithm — fractional surplus transfer, quota-based, multi-winner + tests
- [x] A3: Approval voting tally + checkbox ballot UI
- [x] A4: Yes/No referendum tally + yes/no ballot UI + configurable threshold

#### Phase B: Timed Voting
- [x] B1: Auto-close polls based on `endsAt` (check on page load + API guard)
- [x] B2: Display start/end times on poll pages and dashboard

#### Phase C: Dashboard & Audit
- [x] C1: Enhanced dashboard — method badges, upcoming polls, filter by status
- [x] C2: Audit trail — `AuditLog` model, history view, CSV/JSON export

#### Phase D: Proxy Voting
- [x] D1: `Proxy` model (principalId, proxyId, pollId), designate proxy UI
- [x] D2: Proxy vote casting — proxy's ballot counts for principal

### Milestone 2.5: Organization Accounts (Completed 2026-06-04)
Goal: Organizations can register alongside individuals. Polls scoped to orgs. Org admins manage members. Individual accounts remain fully functional.

Deep-plan decisions:
- Organization model (name, slug), `organizationId` on User (optional) and Poll (optional)
- Users can be individual OR org members — org is additive, not restrictive
- Org signup creates org + admin user atomically in one transaction
- Org admins manage all org polls (not just their own), maintain a member roster
- Org members can still vote in non-org polls and create personal polls
- Fresh schema start (zero existing users)

#### Phase A: Schema & Auth
- [x] A1: Redesign schema — add Organization model, orgId on User/Poll
- [x] A2: Update auth to carry organizationId in JWT session
- [x] A3: Dual-path signup (individual vs. organization)

#### Phase B: Org Management
- [x] B1: Organization settings page — edit name, manage members, invite by email
- [x] B2: Scope polls to organization, org-level authorization on poll management

#### Phase C: Dashboard & Polish
- [x] C1: Dashboard shows org polls + personal polls + votable polls
- [x] C2: Org name displayed in poll pages and results

### Milestone 2: Auth & Voter Integrity (Completed 2026-06-04)
Goal: User accounts, authenticated voting, one-vote-per-person enforcement, voter roll management.

Approach: Auth.js v5 (JWT strategy, credentials provider), bcryptjs. JWT sessions — no database session tables.

#### Phase A: Auth Foundation
- [x] A1: Add User model, add creatorId to Poll, install next-auth + bcryptjs
- [x] A2: Auth.js config (src/auth.ts), middleware, API route handler
- [x] A3: Signup + login pages, session display in layout

#### Phase B: Auth-Gated Poll Management
- [x] B1: Protect poll creation (POST /api/polls) behind auth, set creatorId
- [x] B2: Restrict poll management (status, tokens) to poll creator

#### Phase C: Voter Rolls & Authenticated Voting
- [x] C1: Update VoterRoll to use userId, add voter roll management UI
- [x] C2: Add userId to Ballot (optional), auth-gated ballot submission
- [x] C3: Enforce one-vote-per-person for authenticated votes

#### Phase D: Dashboard
- [x] D1: User dashboard — polls I created + polls I can vote on

### Open Questions
- [ ] Should we support "equal ranking" where a voter gives two candidates the same rank?
- [ ] Should full anonymized ballot data be published for public audit?

## [DECISIONS]

- 2026-06-04: Initial stack — TypeScript + Next.js + PostgreSQL + Prisma + Tailwind + Vitest + Biome. Rationale: full-stack in one language, RDBMS for ballot integrity, mature ecosystem.
- 2026-06-04: Deep-plan validated M2.5 (Organization Accounts). Key decisions: optional org affiliation on User/Poll, atomic org+admin creation, org-level poll authorization, member management included. Fresh schema start.

## [PROGRESS]

| Date | What was done |
|------|---------------|
| 2026-06-04 | Initial scaffold. Stack: TypeScript + Next.js + PostgreSQL + Prisma + Tailwind + Vitest + Biome + Docker Compose. |
| 2026-06-04 | M1 complete: poll creation, status lifecycle, RCV tally (10 tests), voter token generation, drag-and-drop voting, results page, vote receipts. |
| 2026-06-04 | M2 complete: Auth.js v5 setup, signup/login, session management, auth-gated polls, voter roll management, authenticated voting, one-vote-per-person, user dashboard. |
| 2026-06-04 | M2.5 complete: Organization accounts, dual-path signup, org-scoped polls, member management, org dashboard. |
| 2026-06-04 | M3 complete: STV, approval voting, yes/no referendums, timed polls, audit trail, proxy voting, enhanced dashboard. |

## [DISCOVERIES]

- Prisma 7 requires an explicit database adapter (`@prisma/adapter-pg` for PostgreSQL). The old `new PrismaClient()` no-arg constructor is gone.
- @dnd-kit works well for accessible drag-and-drop ranking with keyboard support.

## [OUTCOMES]

- M1 (2026-06-04): Core Voting Engine delivered — poll CRUD, status lifecycle, voter token system, drag-and-drop voting, RCV instant-runoff tally (10 unit tests), public results with anonymized ballots, vote receipt verification. PR: #1.
