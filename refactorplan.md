# Refactor Plan: Modularity & Component Reuse

> **Audience:** an engineer or coding agent who will execute this without prior context.
> **Goal:** make voting methods and the Poll/Election feature set composable so that
> *adding a new kind of poll automatically makes it available as an election contest*,
> and any UI/logic used twice lives in exactly one place.
>
> **Golden rule for every phase:** these are *refactors with no behavior change*
> (except Phase 5, which is a deliberate data-model change). After every step, the
> commands in **§ Verification toolbox** must pass. Commit at each numbered checkpoint.

---

## § Verification toolbox (run these constantly)

```bash
pnpm typecheck      # tsc --noEmit — the primary safety net (strict TS)
pnpm test           # vitest run — unit tests in src/lib/__tests__ and src/app/api/__tests__
pnpm lint           # biome check . — formatting + lint
pnpm build          # next build — catches server/client boundary errors tests miss
```

For schema work (Phase 5 only):
```bash
pnpm db:generate    # regenerate Prisma client into src/generated/prisma
pnpm db:migrate     # create/apply a dev migration
```

**Checkpoint discipline:** Each phase below ends with a ✅ **CHECKPOINT** listing the exact
commands that must be green and what to commit. Do not start the next checkpoint until the
current one is green. Never weaken or delete an existing test to make it pass — if a test
breaks, the refactor changed behavior and must be fixed.

---

## § Current-state map (so you don't have to rediscover it)

**Two parallel worlds.** Almost every Poll concept has an Election twin with a different
Prisma model and route prefix:

| Concept | Poll side | Election side |
|---|---|---|
| Entity model | `Poll` | `Election` |
| Tokens | `VoterToken` | `ElectionVoterToken` |
| Voter roll | `VoterRoll` | `ElectionVoterRoll` |
| Audit | `AuditLog` / `src/lib/audit.ts` | `ElectionAuditLog` / `src/lib/election-audit.ts` |
| Manage-auth | `canManagePoll` (`src/lib/auth.ts`) | `canManageElection` (same file) |
| API prefix | `/api/polls/[slug]/…` | `/api/elections/[slug]/…` |
| Vote link | `/vote/[slug]` | `/elect/[slug]` |

**A contest IS a Poll row.** `prisma/schema.prisma` line ~91: `Poll.electionId` is nullable.
A standalone poll has `electionId = null`; an election contest is a `Poll` row with
`electionId` set and `Election.contests: Poll[]` (schema line ~187). This is why poll routes
are littered with `if (poll.electionId) reject` guards.

**Four hardcoded voting methods:** `rcv`, `stv`, `approval`, `yesno`. Their algorithms live
in `src/lib/{tally,stv,approval,yesno}.ts` and are well-tested in `src/lib/__tests__/`.
**Their signatures and shapes differ** — the registry (Phase 1) must adapt them:

| Method | fn | extra arg | ballot shape | return |
|---|---|---|---|---|
| rcv | `tallyRcv(options, ballots)` | — | `string[]` rankings | `Round[]` |
| stv | `tallyStv(options, ballots, seats)` | seats | `string[]` rankings | `StvRound[]` |
| approval | `tallyApproval(options, ballots, seats)` | seats | `string[]` (approved ids) | `ApprovalResult` |
| yesno | `tallyYesNo(options, ballots, threshold)` | threshold | `Record<string,'yes'\|'no'\|'abstain'>` | `YesNoResult` |

Config lives on the `Poll` row: `votingMethod: string`, `seats: int`, `threshold: int`
(schema lines ~85-87).

**Dispatch is copy-pasted.** Every place that branches on `votingMethod`:

- Selector (static list): `src/components/voting-method-selector.tsx:13-46`
- Tally dispatch ×3:
  - `src/app/polls/[slug]/results/page.tsx:51-237`
  - `src/app/elections/[slug]/results/page.tsx:80-263`
  - `src/app/api/elections/[slug]/export/route.ts:64-75`
- Ballot UI dispatch ×2:
  - `src/app/vote/[slug]/vote-form.tsx:279-296` (+ 3 inline form components lines 22-196)
  - `src/app/elect/[slug]/election-ballot.tsx:52-56,101-107,305-326`
- Backend ballot validation ×2:
  - `src/app/api/ballots/route.ts:80-105`
  - `src/app/api/elections/[slug]/ballots/route.ts:82-115`
- `minOptions`/`seats`/`threshold` rules ×8 files: `api/polls/route.ts:42`,
  `api/elections/[slug]/route.ts:104`, `api/elections/[slug]/contests/route.ts:44`,
  `api/elections/[slug]/contests/[contestId]/route.ts:61`, `polls/new/new-poll-form.tsx`
  (lines 70,85,103,130,147,255-300), `elections/new/new-election-form.tsx`
  (lines 84,102,120,150,194-195,397-441), `elections/[slug]/contest-manager.tsx`
  (lines 88-89,134-135,290-309,375-376,506-522)
- Method label maps: `polls/[slug]/results/page.tsx:239`, `elections/[slug]/results/page.tsx:265`,
  plus `[slug]/page.tsx` displays.
- Ballot display formatting: `polls/[slug]/results/page.tsx:278-286`,
  `elections/[slug]/results/page.tsx:303-313`

> Line numbers are from the current commit and may drift — **grep to confirm** before editing:
> `grep -rn "votingMethod ===" src` and `grep -rn "=== 'yesno'\|=== 'stv'\|=== 'approval'\|=== 'rcv'" src`

---

# PHASE 1 — Voting-Method Registry

**Objective:** one descriptor per method behind a uniform interface, so every dispatch site
becomes a registry lookup and a new method is added in ONE folder. Net-additive; existing
algorithm files are untouched (only wrapped).

### 1.1 — Define the interface and result types

Create `src/lib/voting-methods/types.ts`:

```ts
import type { ComponentType } from 'react'
import type { OptionInput, Round } from '@/lib/tally'
import type { StvRound } from '@/lib/stv'
import type { ApprovalResult } from '@/lib/approval'
import type { YesNoResult } from '@/lib/yesno'

/** What the UI hands us as a raw vote before validation. */
export type RawBallot = string[] | Record<string, string>

/** Per-method config read off the Poll row. */
export interface MethodConfig { seats: number; threshold: number }

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
```

> **Why a discriminated union for `TallyResult`** rather than a single shape: the four
> algorithms genuinely return different structures and the results UIs render them
> differently. The union keeps type-safety while letting `ResultsView` switch on `.kind`.

### 1.2 — Write one descriptor per method

Create `src/lib/voting-methods/{rcv,stv,approval,yesno}.ts`. Each imports the existing
algorithm and the existing ballot component, and fills in the descriptor. Example for yesno
(the trickiest — map ballots, threshold, min 1 option):

```ts
// src/lib/voting-methods/yesno.ts
import { tallyYesNo } from '@/lib/yesno'
import YesNoContest from '@/components/ballot/yesno-contest'
import type { VotingMethodDef } from './types'

export const yesno: VotingMethodDef = {
  id: 'yesno',
  label: 'Yes / No',
  shortDesc: 'Approve or reject each option',
  fullDesc: 'Each option is voted on individually as yes or no…',  // copy from selector
  bestFor: 'Referendums, bylaw changes, or multiple proposals',
  ballotShape: 'map',
  minOptions: 1,
  uses: { seats: false, threshold: true },
  emptyBallot: () => ({}),
  tally: (options, ballots, cfg) => ({
    kind: 'yesno',
    result: tallyYesNo(options, ballots as { rankings: Record<string, string> }[], cfg.threshold),
  }),
  validateBallot: (raw, options) => {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
      return { ok: false, error: 'Expected a yes/no map' }
    const ids = new Set(options.map((o) => o.id))
    for (const [id, v] of Object.entries(raw as Record<string, string>)) {
      if (!ids.has(id)) return { ok: false, error: `Unknown option ${id}` }
      if (!['yes', 'no', 'abstain'].includes(v)) return { ok: false, error: `Bad vote ${v}` }
    }
    return { ok: true, value: raw as Record<string, string> }
  },
  BallotComponent: YesNoContest,
}
```

Do the same for rcv (`minOptions:2`, `uses:{seats:false,threshold:false}`, `emptyBallot:()=>[]`),
stv (`minOptions:2`, `uses:{seats:true,threshold:false}`), and approval
(`minOptions:2`, `uses:{seats:false,threshold:false}`). Copy the human-readable strings
verbatim from `src/components/voting-method-selector.tsx:13-46` so the selector text is
unchanged.

> **The validation logic already exists** inline in `api/ballots/route.ts:80-105` and
> `api/elections/[slug]/ballots/route.ts:82-115`. Move it into `validateBallot`, do not
> reinvent it — match the current accept/reject rules exactly.

### 1.3 — The registry

Create `src/lib/voting-methods/index.ts`:

```ts
import { rcv } from './rcv'; import { stv } from './stv'
import { approval } from './approval'; import { yesno } from './yesno'
import type { VotingMethodDef } from './types'

export const VOTING_METHODS = { rcv, stv, approval, yesno } as const
export type VotingMethodId = keyof typeof VOTING_METHODS

export const ALL_METHODS: VotingMethodDef[] = Object.values(VOTING_METHODS)
/** Never throw on bad data — fall back to rcv, matching today's `else` default. */
export const getMethod = (id: string): VotingMethodDef =>
  (VOTING_METHODS as Record<string, VotingMethodDef>)[id] ?? VOTING_METHODS.rcv
export { type VotingMethodDef, type TallyResult, type ContestBallotProps } from './types'
```

### 1.4 — Registry conformance test (write BEFORE migrating call sites)

Create `src/lib/voting-methods/__tests__/registry.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ALL_METHODS, VOTING_METHODS } from '..'

describe('voting-method registry', () => {
  it('id matches its key', () => {
    for (const [k, m] of Object.entries(VOTING_METHODS)) expect(m.id).toBe(k)
  })
  it('every method is fully specified', () => {
    for (const m of ALL_METHODS) {
      expect(m.minOptions).toBeGreaterThanOrEqual(1)
      expect(typeof m.tally).toBe('function')
      expect(typeof m.validateBallot).toBe('function')
      expect(m.BallotComponent).toBeDefined()
    }
  })
  // Parity: registry tally must equal calling the lib fn directly (guards the adapters).
  it('rcv adapter equals tallyRcv', () => { /* small fixture, compare .rounds */ })
})
```

Add a parity assertion per method comparing `getMethod(id).tally(...)` against the raw lib
function on a tiny fixture. This is the safety net for the adapter wrapping.

✅ **CHECKPOINT 1A:** `pnpm typecheck && pnpm test` green. Commit:
`feat(voting): add voting-method registry (additive, no call sites migrated yet)`.

### 1.5 — Migrate the dispatch sites to the registry, one at a time

After each sub-step run `pnpm typecheck && pnpm test`.

1. **Selector** — `src/components/voting-method-selector.tsx`: delete the local `methods`
   array; import `ALL_METHODS` and map over it. Visual output must be identical.
2. **Backend validation** — replace the inline branches in `api/ballots/route.ts:80-105`
   and `api/elections/[slug]/ballots/route.ts:82-115` with
   `const r = getMethod(method).validateBallot(raw, options); if (!r.ok) return badRequest(r.error)`.
   The double-vote test (`src/app/api/ballots/__tests__/double-vote.test.ts`) must still pass.
3. **`minOptions`/`seats`/`threshold` rules** — in all 8 form/route files, replace
   `votingMethod === 'yesno' ? 1 : 2` with `getMethod(method).minOptions`, and the seats/
   threshold visibility ternaries with `getMethod(method).uses.seats` / `.uses.threshold`.
4. **Ballot UI dispatch** — defer the heavy lifting to Phase 2; for now just have
   `vote-form.tsx` and `election-ballot.tsx` pick `getMethod(m).BallotComponent`.
5. **Tally dispatch** — create a small `ResultsView` server helper that takes
   `(method, options, ballots, cfg)`, calls `getMethod(method).tally(...)`, and switches on
   `result.kind` to render. Replace the if-chains in both results pages and reuse the tally
   call in `api/elections/[slug]/export/route.ts:64-75`. Move the method-label maps
   (`results/page.tsx:239`, `:265`) to read `getMethod(m).label`.

✅ **CHECKPOINT 1B:** `pnpm typecheck && pnpm test && pnpm build` green. Manually confirm
(or via `verify` skill) that creating each of the 4 poll types, voting, and viewing results
is unchanged. Commit: `refactor(voting): route all method dispatch through the registry`.

> **Phase 1 acceptance:** `grep -rn "=== 'yesno'\|=== 'stv'\|=== 'approval'\|=== 'rcv'" src`
> returns **only** files inside `src/lib/voting-methods/`. Everywhere else uses `getMethod`.

---

# PHASE 2 — Unify per-method ballot UI

**Objective:** one component per method is the single source of voting UI, used identically
by standalone polls and election contests. Removes the triplicated inline forms in
`vote-form.tsx`.

### 2.1 — Standardize the ballot components

Make `src/components/ballot/{ranked,approval,yesno}-contest.tsx` all conform to
`ContestBallotProps` (from Phase 1). They mostly do already; align prop names
(`value`/`onChange`/`options`/`disabled`) and ensure each is `'use client'`.

### 2.2 — Collapse `vote-form.tsx`

`src/app/vote/[slug]/vote-form.tsx` currently defines three inline form components
(`RankedVoteForm`, `ApprovalVoteForm`, `YesNoVoteForm`, lines 22-196) with duplicated submit/
error handling. Replace with one shell:

- holds `value = getMethod(method).emptyBallot()` in state,
- renders `getMethod(method).BallotComponent` with `value`/`onChange`,
- has a single submit handler posting to `/api/ballots`.

Delete the three inline components.

### 2.3 — Align `election-ballot.tsx`

`src/app/elect/[slug]/election-ballot.tsx` loops contests; per contest render
`getMethod(contest.votingMethod).BallotComponent`. Initialize each contest's value with
`emptyBallot()` (replaces the `votingMethod === 'yesno' ? {} : []` branches at lines 52-56,
101-107). Submit handler unchanged.

✅ **CHECKPOINT 2:** `pnpm typecheck && pnpm test && pnpm build` green. Manually vote on a
standalone poll of each method AND a multi-contest election mixing methods; confirm receipts
and results match pre-refactor. Commit: `refactor(ballot): single per-method ballot component
for polls and elections`.

---

# PHASE 3 — Shared Poll/Election UI components

**Objective:** collapse ~1,300 lines of entity-renamed components into parameterized shared
components. Driven by a small config object so the SAME component serves both worlds.

### 3.1 — Define the entity config

Create `src/lib/entity-config.ts`:

```ts
export type EntityKind = 'poll' | 'election'
export interface EntityConfig {
  kind: EntityKind
  apiBase: (slug: string) => string      // poll: `/api/polls/${slug}`  election: `/api/elections/${slug}`
  voteBase: (slug: string) => string     // poll: `/vote/${slug}`       election: `/elect/${slug}`
  noun: string                            // "poll" | "election"
  Noun: string                            // "Poll" | "Election"
}
export const POLL_CONFIG: EntityConfig = { /* … */ }
export const ELECTION_CONFIG: EntityConfig = { /* … */ }
```

### 3.2 — Extract the near-identical pairs (do one at a time, delete the originals)

For each, create the shared component under `src/components/manage/`, give it an
`entity: EntityConfig` prop, and replace both call sites. Confirm the audit-action strings:
poll uses `poll_opened/poll_closed`, election uses `election_opened/election_closed` — drive
these from the config too.

| New shared component | Replaces | Notes |
|---|---|---|
| `AuditTrail` | `polls/[slug]/audit-trail.tsx`, `elections/[slug]/audit-trail.tsx` | 95% identical; election orders `desc`, poll `asc` → make `order` a prop |
| `StatusControls` | both `status-controls.tsx` | 98% identical |
| `TokenGenerator` | both `token-generator.tsx` | 99%; the only real diff is `/vote/` vs `/elect/` → use `entity.voteBase` |
| `DeleteEntityButton` | `delete-poll-button.tsx`, `delete-election-button.tsx` | confirmation copy differs → prop |
| `Distributor` | `poll-distributor.tsx`, `election-distributor.tsx` | 99% |
| `OrgDistributor` | `org-poll-distributor.tsx`, `org-election-distributor.tsx` | 99% |
| `VoterRollList` | `polls/[slug]/voter-roll-manager.tsx` (read-only list), `elections/[slug]/election-voter-roll-list.tsx` | functionally identical |

**Leave divergent files separate** (their differences are real and intentional): `poll-editor`
vs `election-editor` (polls edit options, elections don't), `[slug]/page.tsx` (elections render
`ContestManager`), the two `results/page.tsx` (single vs multi-contest, election privacy
threshold `ballotCount >= 10`), and the two `new-*-form.tsx` wizards (different step flows).
These will *consume* the shared pieces and the registry but keep their own top-level structure.
`contest-manager.tsx` and the full election voter-roll manager stay election-only.

After EACH extraction: `pnpm typecheck && pnpm build`, and click through both the poll and
election management screens for that component.

✅ **CHECKPOINT 3:** `pnpm typecheck && pnpm test && pnpm build && pnpm lint` green. Commit
per extraction (e.g. `refactor(ui): shared TokenGenerator for polls and elections`) so each
is independently revertible.

---

# PHASE 4 — API route helpers

**Objective:** remove ~250-350 lines of copy-pasted handler boilerplate. Independent of
Phases 1-3 — can be done in parallel.

### 4.1 — Response + guard helpers

Create `src/lib/api/responses.ts`:

```ts
import { NextResponse } from 'next/server'
export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status })
export const created = (data: unknown) => NextResponse.json(data, { status: 201 })
export const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 })
export const unauthorized = () => NextResponse.json({ error: 'Not authorized' }, { status: 403 })
export const notFound = (error = 'Not found') => NextResponse.json({ error }, { status: 404 })
```

Create `src/lib/api/guards.ts`:

- `requireManager(kind, slug, userId)` — looks up the entity by slug, runs
  `canManagePoll`/`canManageElection`, returns `{ entity }` or a ready `NextResponse` error.
  Replaces the auth+lookup+403 block repeated ~20×.
- `requireOrgAdmin(orgId, userId)` — the membership check duplicated in `api/polls/route.ts:50`
  and `api/elections/route.ts:26`.
- `assertTransition(current, next)` — the `validTransitions` map (`draft→open→closed`)
  duplicated 3× (`polls/[slug]/route.ts:27`, `elections/[slug]/route.ts:7`).
- `generateTokens(count, key, id)` — the `randomUUID`/`randomBytes`/`hashToken` block
  (3 copies; see `polls/[slug]/tokens/route.ts:70`, `elections/[slug]/tokens/route.ts:56`).

### 4.2 — Unify audit logging

Collapse `src/lib/audit.ts` + `src/lib/election-audit.ts` into one
`audit({ kind, id, action, detail, tx })` that writes to `auditLog` or `electionAuditLog`
based on `kind`. Keep the `AuditAction` union; widen for election actions. Update all callers.

### 4.3 — Apply helpers to routes

Migrate the parallel route pairs to the helpers. Preserve the real per-route differences
(poll email-verification check, poll voter-roll notification emails, election contest-count
guard on open, the `poll.electionId` rejection guards — these stay until Phase 5).

✅ **CHECKPOINT 4:** `pnpm typecheck && pnpm test && pnpm build` green; the API tests
(`src/app/api/__tests__/delete-draft.test.ts`, `ballots/__tests__/double-vote.test.ts`) pass
unchanged. Commit: `refactor(api): shared guards, responses, and unified audit logging`.

---

# PHASE 5 — Schema: a first-class `Contest` model (deliberate data-model change)

**Objective:** stop overloading `Poll` to mean "standalone poll OR election contest." This
removes every `if (poll.electionId) reject` guard and clarifies which routes apply to which
entity. **This is the only phase that changes the database — review carefully and back up.**

> ⚠️ This touches most queries and requires a data migration. Do it last, on its own branch,
> with its own PR. If time-boxed, Phases 1-4 already deliver the modularity goal; Phase 5 is
> the clean-up that makes it structurally sound.

### 5.1 — Decide the target shape

Recommended: introduce a `Contest` model that holds the per-contest voting config and options,
and make `Poll` mean *only* a standalone poll. Both share a method config via the registry
(method/seats/threshold are just columns on each).

```prisma
model Contest {
  id           String   @id @default(uuid())
  electionId   String
  title        String
  description  String?
  votingMethod String   @default("rcv")
  seats        Int      @default(1)
  threshold    Int      @default(50)
  contestOrder Int      @default(0)
  election     Election @relation(fields: [electionId], references: [id], onDelete: Cascade)
  options      ContestOption[]
  ballots      ContestBallot[]   // or reuse a polymorphic ballot — see 5.2
  @@index([electionId])
}
```

`Poll` loses `electionId`, `contestOrder`, and the contest-only relations.

### 5.2 — Ballot/token/roll strategy (pick one, document the choice)

- **Option A (cleaner, more migration):** dedicated `ContestOption`, and election ballots
  already live on `Election` via `ElectionReceipt` + per-contest vote rows. Move contest
  votes off `Ballot`.
- **Option B (less churn):** keep election ballots where they are; only split the
  *definition* (Contest/ContestOption) out of Poll, leaving vote storage untouched.

Write the decision and rationale at the top of the migration file before generating it.

### 5.3 — Migration steps

1. Edit `prisma/schema.prisma` to add `Contest` (+ `ContestOption` if Option A).
2. `pnpm db:migrate` to generate a migration in `prisma/migrations/`. **Hand-edit the SQL** to
   add a data-backfill step: `INSERT INTO "Contest" (…) SELECT … FROM "Poll" WHERE "electionId" IS NOT NULL`,
   migrate options, then drop `electionId` from `Poll` (and contest rows from `Poll`).
3. `pnpm db:generate`.
4. Update all queries: anywhere that did `prisma.poll.findMany({ where: { electionId }})` now
   uses `prisma.contest`. The election builder (`new-election-form.tsx`, `contest-manager.tsx`,
   `api/elections/[slug]/contests/*`) targets `Contest`. Remove the `if (poll.electionId)`
   guards from poll token/roll/distribute routes — they're now impossible by construction.
5. The registry (Phase 1) already abstracts method behavior, so contest tally/validation/UI
   need no per-method changes — they read `votingMethod`/`seats`/`threshold` off `Contest`
   exactly as they did off `Poll`.

### 5.4 — Testing the migration

- **Before migrating:** seed a dev DB with at least one standalone poll per method and one
  election with mixed-method contests + cast ballots. Record results-page output.
- Run the migration on that DB. Re-open results — they must be byte-for-byte equivalent.
- Add/adjust unit tests: any test referencing `electionId` on Poll moves to `Contest`.
- Verify cascade delete still works (deleting an Election removes its Contests/options/ballots)
  — there's an existing `add_election_cascade_delete` migration; preserve that behavior.

✅ **CHECKPOINT 5:** `pnpm db:generate && pnpm typecheck && pnpm test && pnpm build` green;
manual parity check (5.4) passes; cascade-delete confirmed. Commit:
`refactor(schema): first-class Contest model, drop Poll.electionId overload`.

---

## § Definition of done (whole refactor)

1. Adding a new voting method = create `src/lib/voting-methods/<id>/` + register it; it appears
   automatically in the selector, standalone poll creation, election contest creation, voting
   UI, validation, tally, and results — **zero other files edited.** (Verify by actually adding
   a throwaway method in a scratch branch and confirming it works end-to-end.)
2. `grep -rn "=== 'yesno'\|=== 'stv'\|=== 'approval'\|=== 'rcv'" src` matches only
   `src/lib/voting-methods/`.
3. No two files contain the same management-UI or API-guard logic (token gen, status
   transition, org-admin check, audit write each exist once).
4. `pnpm typecheck && pnpm test && pnpm build && pnpm lint` all green; no existing test was
   weakened or deleted to get there.
5. `Poll.electionId` no longer exists (Phase 5); poll routes have no contest guards.

## § Execution order summary

```
Phase 1 (registry)      ── highest leverage, lowest risk, do first
Phase 2 (ballot UI)     ── depends on Phase 1
Phase 4 (API helpers)   ── independent; can run parallel to 1–2
Phase 3 (shared UI)     ── after Phase 1 so shared components consume the registry
Phase 5 (schema)        ── last, own branch/PR, only phase that changes the DB
```

Commit at every ✅ CHECKPOINT. One PR per phase keeps reviews tractable and each phase
independently revertible.
