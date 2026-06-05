# Milestone 6 — Multi-Poll Ballots (Elections): Implementation Breakdown

> Detailed, task-by-task build guide for the design in [`MULTI-POLL-BALLOT-PLAN.md`](./MULTI-POLL-BALLOT-PLAN.md). Read that first for rationale and the four resolved decisions; this document is the *how*.
> Written so an implementing LLM can execute one task at a time. Each task lists **Goal · Files · Steps · Validation · Acceptance · Tests**.

## Prerequisites & conventions (read once)

- **Depends on the Milestone 5 remediations** in [`MILESTONE-5-REMEDIATION.md`](./MILESTONE-5-REMEDIATION.md) being applied first — especially FIX-2 (atomic credential claim) and FIX-1 (a working voter-eligibility path). This milestone generalizes the atomic-claim pattern to election scope.
- **Workflow (`AGENTS.md`):** work on a branch `feature/6-multi-poll-ballot` (or one branch per phase), conventional commits, open a PR — do not merge to `main` locally. Run `pnpm test` after each task; keep it green.
- **Migrations:** `pnpm prisma migrate dev --name <desc>` in dev. Mirror the idempotent style (`IF EXISTS` / `IF NOT EXISTS`) seen in `prisma/migrations/20260605170000_milestone_5_security_hardening/migration.sql` if hand-editing prod SQL. Run `pnpm prisma generate` after schema edits.
- **Reuse these existing helpers — do not reinvent:**
  - `src/lib/token.ts` → `hashToken()` (SHA-256). Tokens are stored hashed; raw token shown once at creation.
  - `src/lib/audit.ts` → `auditLog({ pollId, action, detail, tx })`. (Phase A extends it / adds an election variant.)
  - `src/lib/rate-limit.ts` → `rateLimit({ key, max, windowMs })` (in-process; single-instance assumption).
  - `src/lib/shuffle.ts` → `seededShuffle(arr, seed)`.
  - `src/lib/auth.ts` → `canManagePoll(pollId, userId)`; add an `canManageElection` sibling.
  - `src/lib/slug.ts` → slug generation.
  - Tally engines: `src/lib/{tally,stv,approval,yesno}.ts` — used unchanged on contests.
- **Auth/authz pattern (post-FIX-2):** every management route guards with `if (!session?.user?.id || !(await canManage…(…))) return 403`. Never the `session?.user?.id && …` short-circuit (that was the A2 bug).
- **Scope of v1:** Phases A, B, D, E, F. **Phase C (ballot styles) is the fast-follow** — build the reserved `ballotStyleId` columns in Phase A, but the `BallotStyle` model + UI come after v1. In v1, `ballotStyleId` is always `null` = "voter sees every contest."

---

## Phase A — Data model & back-compat

### A1 — Write the decisions into the spec
**Goal:** make the four resolved decisions canonical so later tasks don't re-litigate them.
**Files:** `docs/SPEC.md` (modify).
**Steps:** Add an "Elections (multi-poll ballots)" section summarizing: reuse `Poll` as contest; v1 everyone-sees-every-contest with reserved `ballotStyleId`; empty-ballot-per-contest for blanks; one `ElectionReceipt` per package; atomic all-or-nothing submission; cross-contest secrecy rules (§6 of the plan).
**Acceptance:** spec reflects the plan's §8 "Resolved" list. No code.

### A2 — Schema additions + migration
**Goal:** introduce the election layer additively; standalone polls unchanged.
**Files:** `prisma/schema.prisma` (modify); new migration; `pnpm prisma generate`.
**Steps:**
1. Add models (finalize names/fields from plan §4): `Election`, `ElectionVoterToken`, `ElectionVoterRoll`, `ElectionReceipt`, `ElectionAuditLog`.
   - `Election`: `id, title, description?, slug @unique, status @default("draft"), startsAt?, endsAt?, creatorId?, organizationId?, createdAt, updatedAt` + relations `contests Poll[]`, `tokens`, `rolls`, `receipts`, `auditLogs`.
   - `ElectionVoterToken`: `id, electionId, tokenHash, ballotStyleId String?, usedAt?, createdAt`, `@@unique([electionId, tokenHash])`, `@@index([electionId])`.
   - `ElectionVoterRoll`: `id, electionId, userId, ballotStyleId String?, hasVoted @default(false), votedAt?`, `@@unique([electionId, userId])`, `@@index([electionId])`.
   - `ElectionReceipt`: `id, electionId, receiptCode @unique, castAt @default(now())`, `@@index([electionId])`.
   - `ElectionAuditLog`: `id, electionId, action, detail?, createdAt`, `@@index([electionId])`.
2. On `Poll` add: `electionId String?`, `contestOrder Int @default(0)`, relation `election Election? @relation(...)`. Add `@@index([electionId])`.
3. `Ballot.rankings` is already `Json` — empty array / `{}` represents a blank (A skip). No change needed, but document the empty-ballot convention in a comment.
4. Create migration; ensure it's additive (no drops). `pnpm prisma generate`.
**Validation:** existing single-poll queries still compile; `Poll.electionId` defaults null for all existing rows.
**Acceptance:** `pnpm prisma migrate dev` applies cleanly; `pnpm test` green; app builds.
**Tests:** add a Prisma smoke test (or rely on build) that an `Election` with two contest `Poll`s can be created and read back.

### A3 — Back-compat deferral + guards
**Goal:** a parented `Poll` (contest) defers lifecycle to its `Election` and cannot be voted/credentialed standalone.
**Files:** new `src/lib/election.ts` (helpers); modify `src/app/api/polls/[slug]/{tokens,roll,distribute,route}.ts`, `src/app/vote/[slug]/page.tsx`, `src/app/api/ballots/route.ts`, `src/app/polls/[slug]/results/page.tsx`.
**Steps:**
1. In `src/lib/election.ts` add `effectiveStatus(poll)` → returns `poll.election?.status ?? poll.status`, and `effectiveWindow(poll)` for `startsAt/endsAt`. Add `canManageElection(electionId, userId)` mirroring `canManagePoll` (creator or org admin).
2. In the per-poll **token/roll/distribute** routes and **`/vote/[slug]`** and **`POST /api/ballots`**: if `poll.electionId` is set, reject with 400 `"This poll is a contest within an election; manage/vote via the election."` (Contests are only votable through the election flow in Phase D.)
3. Anywhere that reads `poll.status` for a potentially-parented poll (results page, admin detail), use `effectiveStatus`.
**Validation:** a standalone poll (electionId null) behaves exactly as before.
**Acceptance:** creating a contest under an election and hitting its standalone `/vote/[slug]` returns the guard error; standalone polls unaffected.
**Tests:** unit test `effectiveStatus`/`effectiveWindow`; manual check of the guard.

---

## Phase B — Admin: build an election

### B1 — Election CRUD + contest management
**Goal:** create/edit an election and add/remove/reorder contests.
**Files:** new `src/app/api/elections/route.ts` (POST/GET), `src/app/api/elections/[slug]/route.ts` (GET/PATCH), `src/app/api/elections/[slug]/contests/route.ts` (POST add contest, PATCH reorder, DELETE); new pages `src/app/elections/new/page.tsx`, `src/app/elections/[slug]/page.tsx` (admin manage); reuse `src/lib/slug.ts`.
**Steps:**
1. `POST /api/elections`: auth required; create `Election` (status `draft`), optional `organizationId` (verify admin membership like `src/app/api/polls/route.ts` does). Generate unique slug.
2. Contests are `Poll` rows with `electionId` set + `contestOrder`. Reuse the poll-creation logic (extract a `createPoll()` helper from `src/app/api/polls/route.ts` if convenient) so a contest gets `votingMethod`, `seats`, `threshold`, options. New contests inherit no independent status/window (they defer).
3. Reorder = update `contestOrder`. Delete contest = delete the `Poll` (cascades options). Only allowed while election is `draft`.
4. Admin UI: an election page listing contests in `contestOrder`, with add/edit/remove/reorder and a "voters" tab (B2) and lifecycle controls (B3). Model it on the existing poll wizard `src/app/polls/new/page.tsx` and detail `src/app/polls/[slug]/page.tsx`.
**Validation:** all mutations require `canManageElection`; structural edits only while `draft`.
**Acceptance:** an admin can build a 3-contest election (one per method) end to end in the UI.
**Tests:** route tests for create/add-contest/reorder authz (403 when not manager); manual UI walkthrough.

### B2 — Election credentials & distribution (one per voter)
**Goal:** issue one credential per voter for the whole election.
**Files:** new `src/app/api/elections/[slug]/tokens/route.ts`, `src/app/api/elections/[slug]/roll/route.ts`, `src/app/api/elections/[slug]/distribute/route.ts`; UI components mirroring `token-generator.tsx`, `voter-roll-manager.tsx`, `poll-distributor.tsx`, `org-poll-distributor.tsx` but election-scoped.
**Steps:**
1. Token generation: mirror `src/app/api/polls/[slug]/tokens/route.ts` post-FIX state — generate `randomBytes(32).toString('hex')`, store `hashToken(raw)` in `ElectionVoterToken`, return raw **once**. `ballotStyleId` = null in v1. GET returns metadata only (id/createdAt/usedAt), never raw.
2. Roll/distribute: mirror the poll versions; eligibility keyed by `electionId`. One `ElectionVoterRoll` per user. Email link points to `/elect/[slug]` (no per-poll links). Respect the FIX-1 email-verification policy that ends up in place.
3. Audit each action via the election audit helper (`tokens_generated`, `voter_added/removed`).
**Validation:** structural credential changes only while `draft`; authz via `canManageElection`.
**Acceptance:** admin generates N tokens and/or adds N roll voters; each voter has exactly one credential for the election.
**Tests:** route tests (authz + "one per voter" uniqueness); confirm GET never leaks raw tokens.

### B3 — Election lifecycle (cascade + guards + auto-close)
**Goal:** open/close the whole election safely.
**Files:** `src/app/api/elections/[slug]/route.ts` (PATCH status); `src/lib/election.ts`; election admin page lifecycle controls (model on `status-controls.tsx`).
**Steps:**
1. Transitions `draft → open → closed` (reuse the `validTransitions` map pattern from `src/app/api/polls/[slug]/route.ts`).
2. **Guard opening:** refuse `open` if the election has zero contests, or any contest has `< minOptions` (1 for yesno, else 2), or missing required fields. Return a clear list of offending contests.
3. **Cascade:** because contests defer via `effectiveStatus`, opening/closing the election is what makes contests votable. No per-contest status writes needed.
4. **Auto-close:** mirror the poll auto-close (`src/app/api/ballots/route.ts` checks `endsAt` on cast) — in the election ballot endpoint (D3) and on the `/elect/[slug]` load, if `open` and `endsAt < now`, flip to `closed`.
5. Audit `poll_opened`/`poll_closed` equivalents at election scope (`election_opened`/`election_closed`).
**Validation:** can't open an incomplete election; closed elections reject new ballots.
**Acceptance:** open → contests become votable; close → voting blocked, results unlocked (E1).
**Tests:** unit test the open-guard (incomplete election rejected); manual lifecycle walkthrough.

---

## Phase C — Ballot styles (FAST-FOLLOW, post-v1)

> Not part of v1. The `ballotStyleId` columns already exist (A2). Build this after the v1 flow ships.

### C1 — `BallotStyle` model + admin
**Goal:** named subsets of contests. **Files:** `prisma/schema.prisma` (`BallotStyle` model from plan §4, or a `BallotStyleContest` join table), migration; admin UI under the election page. **Steps:** define styles (name + contest set) scoped to an election; CRUD while `draft`. **Acceptance:** admin defines ≥2 styles selecting different contest subsets.

### C2 — Assign styles + resolve at vote time
**Goal:** each voter's credential carries a `ballotStyleId`; vote flow shows only that subset. **Files:** B2 credential routes (accept `ballotStyleId`), D1 loader (resolve contests by style), D3 submit (reject contests outside the voter's style). **Steps:** null style = all contests (back-compat). **Acceptance:** two voters with different styles see/submit different contest sets; submitting an out-of-style contest is rejected.

### C3 — Admin visibility
**Goal:** admin can see which voters get which ballot. **Files:** election admin UI. **Acceptance:** roster shows assigned style per voter; counts per style.

---

## Phase D — Voting session

### D0 — Extract reusable per-method ballot components (refactor)
**Goal:** make the per-method UIs reusable outside the single-poll page.
**Files:** `src/app/vote/[slug]/vote-form.tsx` currently defines `RankedVoteForm`, `ApprovalVoteForm`, `YesNoVoteForm` internally and submits directly to `/api/ballots`. Extract the **input/selection** portions into presentational components (e.g. `src/components/ballot/{RankedContest,ApprovalContest,YesNoContest}.tsx`) that take `options` + `value` + `onChange` and render no submit button. STV uses the ranked input. Keep the existing single-poll `VoteForm` working by composing these.
**Acceptance:** single-poll voting still works (regression); the three components render and emit selection state without self-submitting.
**Tests:** existing single-poll flow manual check; component renders for each method.

### D1 — `/elect/[slug]` multi-contest page
**Goal:** one session showing every contest the voter is entitled to.
**Files:** new `src/app/elect/[slug]/page.tsx` + `src/app/elect/[slug]/election-ballot.tsx` (client).
**Steps:**
1. Load election by slug with contests ordered by `contestOrder` + options. If election not `open` (use auto-close check), show the closed/not-open state (model on `src/app/vote/[slug]/page.tsx`).
2. Validate credential **once**: token (`hashToken` lookup in `ElectionVoterToken`, not used) OR `session` user in `ElectionVoterRoll` not `hasVoted`. v1: ballot style null → all contests.
3. Render each contest with its method component (D0). Per-contest instructions and an explicit "leave this contest blank / abstain" control. Progress indicator.
**Validation:** invalid/used credential → blocked with message; not-on-roll → blocked.
**Acceptance:** a credentialed voter sees all contests with correct per-method UIs.
**Tests:** manual: token path and session path both render the full ballot.

### D2 — Review-and-confirm step
**Goal:** voter reviews all selections (including blanks) before final submit; no identifiable partial state persisted.
**Files:** `src/app/elect/[slug]/election-ballot.tsx`.
**Steps:** a review screen summarizing each contest's selection (or "No selection"); back-to-edit; final submit triggers D3. Do not POST anything before final submit.
**Acceptance:** review shows accurate selections and blanks; editing returns without data loss within the session.

### D3 — `POST /api/elections/[slug]/ballots` (atomic package submit)
**Goal:** record the whole ballot atomically with one receipt, preserving cross-contest secrecy.
**Files:** new `src/app/api/elections/[slug]/ballots/route.ts`; reuse `generateReceipt` style (random `randomBytes(16).hex`), `auditLog`, `rateLimit`, `hashToken`.
**Steps (single `prisma.$transaction`):**
1. Rate-limit by IP (mirror `src/app/api/ballots/route.ts`).
2. Resolve election; reject if not `open` (auto-close check).
3. **Atomically claim the credential** (the FIX-2 pattern at election scope):
   - token: `tx.electionVoterToken.updateMany({ where: { electionId, tokenHash, usedAt: null }, data: { usedAt: new Date() } })` → throw `AlreadyVotedError` if `count !== 1`.
   - session: `tx.electionVoterRoll.updateMany({ where: { electionId, userId, hasVoted: false }, data: { hasVoted: true, votedAt: new Date() } })` → throw if `count !== 1`.
4. Determine the voter's entitled contest set (v1 = all contests; later = ballot style). Reject the whole package (throw) if the body contains any contest not in the set.
5. For **every** entitled contest, validate the submitted selection against that contest's `votingMethod` (reuse the validation shape already in `src/app/api/ballots/route.ts`: array of valid option ids for rcv/stv/approval; `{optionId: yes|no|abstain}` for yesno) and create exactly one `Ballot` — a skipped contest is written with an **empty/abstain** value (Decision 3). Do not store `userId`, `voterToken`, a package id, or a precise per-ballot timestamp that could cluster the package (coarsen/omit per plan §6).
6. Create one `ElectionReceipt` (random code).
7. `auditLog` election `ballot_cast` (timestamp only).
8. Return `{ receiptCode, castAt }`.
   - Map `AlreadyVotedError` → 409; other errors → 500 with `console.error` (mirror FIX-2's catch).
**Validation:** all-or-nothing — any contest validation failure rolls back and does **not** consume the credential. Overvotes (where illegal) rejected with a clear message.
**Acceptance:** submitting a full ballot yields one receipt; the credential is consumed once; one ballot row exists per contest (blanks included); no cross-contest linking key is stored.
**Tests (add the project's first election route tests):**
- Happy path: N contests → N ballot rows + 1 receipt + credential used.
- Double-submit race (two concurrent same-token requests via `Promise.all`): exactly one 201, one 409; ballot rows == N (not 2N).
- Partial/invalid contest in package → 0 ballots written, credential NOT consumed.
- Skipped contest → blank ballot row present and counted as undervote by the tally.

---

## Phase E — Results, audit & certification

### E1 — Combined results page
**Goal:** one page, per-contest tallies, secrecy-preserving.
**Files:** new `src/app/elections/[slug]/results/page.tsx`; reuse `src/lib/{tally,stv,approval,yesno}.ts` and `seededShuffle`.
**Steps:** for each contest in order, run the matching tally over its `Ballot`s and render results (reuse the rendering blocks from `src/app/polls/[slug]/results/page.tsx`). Election-level turnout (`hasVoted`/used tokens vs roll size). Per-contest "all ballots" dump only when election is `closed`, **shuffled per contest** with `seededShuffle(ballots, contest.id)`. Honor a small-electorate suppression threshold (open question #7 — pick a number, e.g. suppress per-ballot dump under 10). Log `results_viewed` once (dedupe like the existing results page).
**Acceptance:** correct per-contest winners; ballots hidden until closed and shuffled when shown; undervotes counted.
**Tests:** unit-level tally already covered; add a results integration check that a closed election renders each contest's tally.

### E2 — Election audit trail + admin view
**Goal:** election-scoped audit history.
**Files:** new `src/app/api/elections/[slug]/audit/route.ts` (admin-only GET), audit-trail UI mirroring `src/app/polls/[slug]/audit-trail.tsx`; election audit helper from A2.
**Steps:** list `ElectionAuditLog` newest-first; admin-only (`canManageElection`). Ensure `ballot_cast` rows carry timestamp only (no voter/contest linkage).
**Acceptance:** admin sees the lifecycle + cast events; non-admin gets 403.

### E3 — Certification bundle export
**Goal:** a reproducible third-party-verifiable artifact.
**Files:** new `src/app/api/elections/[slug]/export/route.ts` (admin-only; `?format=json|csv`).
**Steps:** only when `closed`. Emit per contest: method/seats/threshold, the (shuffled, anonymized) ballot set, and the computed tally; plus the election audit log and turnout. The bundle must let someone re-run the tally and get the same winners. Apply the small-electorate suppression rule consistently with E1.
**Acceptance:** exported bundle re-tallies to the same winners offline; contains no voter identities.
**Tests:** snapshot/round-trip test: feed the exported ballots back into the tally libs → identical winners.

---

## Phase F — Polish

### F1 — Contest/candidate order rotation (optional)
**Goal:** reduce position bias. **Files:** D1 render + a per-ballot rotation seed. **Steps:** optional election flag; rotate display order deterministically (must not affect tallies). **Acceptance:** display order varies as configured; results unchanged.

### F2 — Accessibility & long-ballot handling
**Goal:** long ballots remain usable/accessible. **Files:** `src/app/elect/[slug]/*`. **Steps:** keyboard nav across contests (the ranked UI already uses @dnd-kit keyboard support), clear progress, no work loss within session, screen-reader labels per contest. **Acceptance:** full ballot completable by keyboard; passes an a11y pass.

### F3 — Organizer documentation
**Goal:** a guide for running a multi-contest election. **Files:** `docs/` guide. **Acceptance:** covers build → credential → open → vote → close → results → certify.

---

## Definition of done (v1 = Phases A, B, D, E, F)
- Admin builds a multi-contest election (mixed methods), issues one credential per voter, opens it.
- A voter casts all contests in one atomic session and gets one receipt; double-submit is impossible (race-safe).
- Skipped contests are recorded as undervotes; no cross-contest linkage is stored.
- Closed election shows combined, per-contest, secrecy-preserving results and exports a re-tallyable certification bundle.
- Standalone single-poll voting is unchanged. `pnpm test` green, including new election route tests.
- Ballot styles (Phase C) tracked as the fast-follow.
