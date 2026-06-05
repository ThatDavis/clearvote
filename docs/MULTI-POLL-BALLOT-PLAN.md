# Design Plan — Multi-Poll Ballots (Elections)

> Goal: let a voter cast **one ballot that contains several contests at once** — e.g. elect a president by RCV, fill three board seats by STV, and decide four yes/no propositions, all in a single voting session — the way a real election ballot works.
>
> This is a planning document, not an implementation. It defines the capabilities a credible multi-contest election needs, the gap against today's code, a proposed data model, a phased build, and the design decisions that need a human call before coding.

---

## 1. Where we are today

The system is strictly **one poll = one ballot = one slug**:
- `Poll` is the whole unit: title, `votingMethod` (rcv/stv/approval/yesno), `seats`, `threshold`, `status`, time window, options, results.
- `VoterToken`, `VoterRoll`, `Ballot`, and `AuditLog` are all scoped by `pollId`.
- A voter visits `/vote/[slug]`, sees one contest, and `POST /api/ballots` records one `Ballot` for that one poll.
- There is **no** grouping concept (no `election`, `contest`, or `ballotStyle` anywhere in the schema).

So to run a 10-contest election today you'd create 10 polls and send each voter 10 separate links — unusable. Everything below is about adding a grouping layer **without breaking standalone single-poll voting**, which should remain a first-class use case.

> Integration note: this builds directly on the Milestone 5 security model and its open remediations (`docs/MILESTONE-5-REMEDIATION.md`). Tokens are now hashed and single-use; eligibility is `VoterRoll.hasVoted`; ballots are unlinked from voter identity. The multi-poll design must preserve all three, and the credential model moves from per-poll to per-election (see §4 and §6).

---

## 2. What makes it usable for real multi-contest elections

This is the heart of the request — the capabilities that separate "10 polls in a trench coat" from a real ballot:

1. **One credential, one session, one submission.** A voter gets a single link, sees every contest they're entitled to on one ballot, and submits once. The credential is consumed once and marks *all* contests as voted, atomically — you can never end up half-voted.

2. **Mixed voting methods on one ballot.** Each contest keeps its own method and rules (RCV / STV / approval / yes-no), with method-appropriate UI and clear per-contest instructions. The voter shouldn't have to relearn the interface per contest.

3. **Ballot styles (per-contest eligibility).** Real elections don't show every voter every contest — district 3 voters see the district 3 seat; full members vote on bylaws, associates don't. Voters are assigned a **ballot style** that determines *which subset* of contests they see. This is the single biggest "real election" feature and the main reason a flat list of polls is insufficient.

4. **Undervotes, abstention, and skips are first-class.** Leaving a contest blank, ranking only some candidates, or approving none must be valid and recorded as a deliberate non-vote — distinct from "never reached this contest." Overvotes (where illegal) are rejected at submit with a clear message.

5. **Cross-contest ballot secrecy.** It must be impossible to correlate one voter's choices *across* contests. If every contest-ballot from one voter shares an id, a timestamp, or a submission order, an observer can reconstruct "person X voted A here and B there." Per-contest ballots must be independently stored, shuffled, and carry no shared correlatable key. (This is subtle and easy to get wrong — see §6.)

6. **A review-and-confirm step.** Before final submission the voter reviews all selections (including blanks) on one screen, because there is no "save draft and come back" — secrecy forbids persisting an identifiable partial ballot.

7. **Election-level lifecycle.** Open/close the whole election (cascading to contests), a shared time window with auto-close, and guards so you can't open an election that still has a draft/empty contest.

8. **Combined, verifiable results & certification.** One results page covering all contests; per-contest tallies; a single **certification bundle** export (anonymized per-contest ballots + tallies + audit log) that a third party can re-run. Election-level turnout/quorum reporting.

9. **Election-level audit trail.** Audit events for the election as a whole (created, opened, ballot package cast, closed, results viewed) plus the existing per-contest events, with cast events recording timestamp only — never who-voted-what.

10. **Receipts that don't leak.** A single receipt for the whole ballot that lets a voter confirm "my ballot was recorded" without revealing contents or enabling cross-contest linkage.

11. **Contest ordering (and optional rotation).** Deterministic display order, with the option to randomize candidate/contest order per ballot to reduce position bias — a real requirement in some jurisdictions.

12. **Back-compatibility.** Standalone single-poll voting keeps working unchanged; the election layer is additive.

---

## 3. Core model decision (decide first)

**How should a "contest" relate to a `Poll`?** Everything else depends on this.

- **Option A — Reuse `Poll` as the contest; add an `Election` container.** Add an `Election` model and a nullable `electionId` on `Poll`. A poll with `electionId = null` is a standalone poll (today's behavior); a poll with an `electionId` is a contest within that election.
  - *Pros:* reuses all four tally engines, the options model, seats/threshold, and most admin UI as-is; smallest schema delta; standalone polls untouched.
  - *Cons:* `Poll.status`, `slug`, `startsAt/endsAt`, and per-poll tokens/rolls become partly redundant with the election and must be made to defer to it; some fields stop applying to contests.
- **Option B — New first-class `Contest` model distinct from `Poll`.** Cleaner separation, but duplicates options/tally wiring and splits the codebase into "polls" and "contests."
- **Option C — Election is just a tag/collection over existing polls; voting stays per-poll.** Minimal, but fails capabilities #1, #4, #5, #6 (no single session, no atomic submit, weak cross-contest secrecy). Not recommended for real elections.

**DECIDED — Option A (reuse `Poll`).** It maximizes reuse and keeps standalone polls first-class. A small helper (e.g. `effectiveStatus(poll)` returning the parent election's status when `electionId` is set) absorbs the field-deferral cost. The rest of this plan assumes Option A.

---

## 4. Proposed data model (Option A)

New and changed models (illustrative — finalize during Phase A):

```prisma
model Election {
  id             String    @id @default(uuid())
  title          String
  description    String?
  slug           String    @unique
  status         String    @default("draft") // draft | open | closed
  startsAt       DateTime?
  endsAt         DateTime?
  creatorId      String?
  organizationId String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  contests    Poll[]                  // contests = polls with electionId set
  tokens      ElectionVoterToken[]
  rolls       ElectionVoterRoll[]
  ballotStyles BallotStyle[]
  auditLogs   ElectionAuditLog[]
}

model Poll {
  // ...existing fields...
  electionId   String?
  contestOrder Int      @default(0)   // display order within the election
  // When electionId is set: Poll.status/startsAt/endsAt/tokens/rolls defer to the Election.
}

// Eligibility & credentials move to the ELECTION level (one per voter, not per contest)
model ElectionVoterToken {
  id         String    @id @default(uuid())
  electionId String
  tokenHash  String
  ballotStyleId String?               // which subset of contests this voter sees
  usedAt     DateTime?
  createdAt  DateTime  @default(now())
  @@unique([electionId, tokenHash])
}

model ElectionVoterRoll {
  id            String    @id @default(uuid())
  electionId    String
  userId        String
  ballotStyleId String?
  hasVoted      Boolean   @default(false)
  votedAt       DateTime?
  @@unique([electionId, userId])
}

// Ballot styles = named subsets of contests (per-contest eligibility, capability #3)
// DECIDED: not built in v1. The nullable ballotStyleId columns above are RESERVED now
// (null = voter sees all contests) so styles can be added later with no credential-table
// migration. The BallotStyle model itself lands in the fast-follow phase (Phase C).
model BallotStyle {
  id         String   @id @default(uuid())
  electionId String
  name       String
  contestIds Json     // or a join table BallotStyleContest
}

// One receipt per ballot package (DECIDED, Decision 4). Standalone — NOT linked to the
// per-contest Ballot rows, so it carries zero cross-contest linkage. Atomic submission
// means "package recorded" proves every contest was recorded.
model ElectionReceipt {
  id          String   @id @default(uuid())
  electionId  String
  receiptCode String   @unique
  castAt      DateTime @default(now())

  election Election @relation(fields: [electionId], references: [id], onDelete: Cascade)
  @@index([electionId])
}
```

`Ballot` stays **per-contest and unlinked** (one `Ballot` row per contest in the voter's ballot style, no `userId`, no shared package id, no link to `ElectionReceipt` — see §6). Skipped contests are written as an explicit empty/abstain ballot (DECIDED, Decision 3) so every contest has uniform row counts. `ElectionAuditLog` mirrors today's `AuditLog` at the election scope.

**Key shift:** credentials/eligibility move from `pollId` to `electionId`. Standalone polls keep using the existing `VoterToken`/`VoterRoll`. The ballot-casting flow branches on "is this an election or a standalone poll."

---

## 5. Voting & submission flow (capabilities #1, #4, #6)

- New route `/elect/[slug]` (name TBD) loads the election, validates the credential **once**, resolves the voter's **ballot style** → the ordered list of contests to render.
- One page renders each contest with its method-specific component (reuse the pieces inside `vote-form.tsx`), a progress indicator, and explicit "leave blank / abstain" affordances.
- A **review step** shows all selections and blanks before submit. No identifiable partial state is persisted server-side.
- New endpoint `POST /api/elections/[slug]/ballots` accepts the full package `{ token?, contests: [{ pollId, rankings }...] }` and in **one transaction**:
  1. Atomically claim the election credential (guarded `updateMany` on `usedAt: null` / `hasVoted: false`, per `MILESTONE-5-REMEDIATION.md` FIX-2 — applied at election scope).
  2. Validate every contest against the ballot style (reject contests the voter isn't entitled to) and each contest's own rules (valid option ids, method-appropriate shape, undervote/overvote policy).
  3. Create one `Ballot` per *voted* contest (blanks recorded per the secrecy decision in §6).
  4. Write the `ballot_cast` audit event (timestamp only).
  5. Return a single receipt.
  - All-or-nothing: any validation failure rolls back the whole package; the credential is not consumed.

---

## 6. Cross-contest secrecy (capability #5 — the hard one)

The risk: linking a voter's choices across contests. Decisions to lock down before coding:

- **No shared key across a voter's contest-ballots.** Do not store an `electionBallotId`/voter id on the per-contest `Ballot` rows. Each contest's ballots must be independently shuffled on display (extend `seededShuffle`), so row order reveals nothing.
- **Timestamp granularity.** All contests in one package are cast at the same instant; storing exact `castAt` per row lets you cluster a voter's ballots across contests. Mitigate by coarsening or omitting per-ballot timestamps in the secret set (keep precise timing only in the election-scoped audit count, not on ballots).
- **How to record an undervote/blank — DECIDED (Decision 3): write an empty ballot per contest.** Every contest in the voter's ballot style gets a `Ballot` row; a skip is stored as an explicit "no selection" (empty `rankings` / `abstain` marker), distinct from a spoiled ballot, so the tally counts undervotes correctly. This keeps row counts uniform per contest so abstention is not a side channel. The residual tiny-electorate risk is handled by the suppression threshold below, not by storage.
- **Receipts — DECIDED (Decision 4): one package receipt.** A standalone `ElectionReceipt` (random code, election-scoped) that is **not** linked to the per-contest `Ballot` rows. Because submission is atomic, "package recorded" proves every contest was recorded, so this gives full assurance with zero cross-contest linkage and the friendliest UX. `/verify` returns election-level "recorded at" only — never contests or contents.
- **Small-electorate warning.** For tiny rolls, the per-ballot dump (even shuffled) plus turnout can de-anonymize. Consider suppressing per-ballot publication below a threshold and document the limit.

---

## 7. Phased implementation plan

Milestone-style, matching `PLAN.md` conventions. Land each phase behind the standard branch/PR flow in `AGENTS.md`.

### Phase A — Data model & back-compat
- A1: Decide §3 (Option A assumed) and §6 secrecy rules; write them into `docs/SPEC.md`.
- A2: Add `Election`, `ElectionVoterToken`, `ElectionVoterRoll`, `BallotStyle`, `ElectionAuditLog`; add `electionId` + `contestOrder` to `Poll`; migration (mirror the idempotent style in the M5 migration).
- A3: Make `Poll` behavior defer to `Election` when `electionId` is set (status, time window, eligibility); keep standalone polls unchanged. Add tests.

### Phase B — Admin: build an election
- B1: Create/edit an election; add/remove/reorder contests (each contest is a Poll with its method + options).
- B2: Election-level credential generation & distribution (one token/roll entry per voter); reuse hashed-token + email patterns. One link per voter.
- B3: Election lifecycle (open/close cascade; guard against opening with a draft/empty contest; auto-close on `endsAt`).

### Phase C — Ballot styles (per-contest eligibility)
- C1: Define ballot styles (named contest subsets) and assign to voters/tokens.
- C2: Resolve a voter's contest set at vote time; enforce on submit.
- C3: Admin UI for managing styles and seeing which voters get which ballot.

### Phase D — Voting session
- D1: `/elect/[slug]` multi-contest page reusing per-method components; progress + per-contest instructions; blank/abstain affordances.
- D2: Review-and-confirm screen.
- D3: `POST /api/elections/[slug]/ballots` — atomic package submission, full validation, single receipt (per §5/§6).

### Phase E — Results, audit & certification
- E1: Combined results page (per-contest tallies, reusing existing tally libs); turnout/quorum.
- E2: Election-scoped audit trail + admin view.
- E3: Certification bundle export (anonymized per-contest ballots + tallies + audit log), reproducible by a third party; honor the small-electorate suppression rule.

### Phase F — Polish
- F1: Optional contest/candidate order rotation.
- F2: Accessibility pass on long ballots; long-session handling.
- F3: Docs: organizer guide for running a multi-contest election.

---

## 8. Decisions

**Resolved (2026-06-05):**
1. **Contest model — reuse `Poll`** (Election container + nullable `electionId`). §3.
2. **Ballot styles — fast-follow, columns reserved now.** v1 = everyone sees every contest; nullable `ballotStyleId` on the election token/roll ships in v1 (null = sees all) so styles add with no credential migration. §4, Phase C.
3. **Blank contests — empty ballot per contest** with an explicit "no selection"/abstain marker; uniform row counts. §6.
4. **Receipts — one package receipt** (standalone `ElectionReceipt`, unlinked to contest ballots). §4, §6.

**Still open (can be settled during build):**
5. **Standalone polls:** keep them as a permanent first-class mode, or eventually treat every poll as a single-contest election internally?
6. **Cross-method results presentation:** any combined/summary view, or strictly per-contest?
7. **Small-electorate threshold** for suppressing per-ballot publication — what number?

---

## 9. Relationship to existing work
- **Reuses:** all four tally engines (`src/lib/{tally,stv,approval,yesno}.ts`), options model, hashed-token + email distribution, `seededShuffle`, audit helper, rate limiting.
- **Depends on:** the Milestone 5 remediations being applied first — especially the atomic credential claim (FIX-2), which this generalizes to election scope, and a working voter-eligibility path (FIX-1). Build on top of those, not around them.
- **Must not regress:** ballot secrecy (now extended to *cross-contest* secrecy), single-use credentials, or standalone single-poll voting.
