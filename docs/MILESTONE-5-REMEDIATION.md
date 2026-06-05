# Milestone 5 — Post-Merge Remediation

> Findings from an audit of the Milestone 5 (Election Security & Audit Hardening) work merged in PR #8.
> Each item below is self-contained: impact, root cause with file references, a step-by-step fix, and how to verify it.
> An implementer should be able to work through these top-to-bottom without prior context.

**Stack reminder:** Next.js (App Router) + Prisma + PostgreSQL. Tests use Vitest (`pnpm test`). Tally logic lives in `src/lib/*.ts` with unit tests in `src/lib/__tests__/`. There are currently **no automated tests for API route handlers** — manual verification steps are given where unit tests don't apply, plus an optional note on adding route tests.

**Priority order:** FIX-1 (critical, blocks all roll voting) → FIX-2 (critical, election integrity) → FIX-3/4/5 (hardening).

---

## FIX-1 — Email-verification gate locks out every voter (CRITICAL)

### Impact
No user can be added to a voter roll. Every authenticated/org-based vote path is dead. The "add voter" route and the org-member distribution path both reject everyone with *"…has not verified their email."*

### Root cause
The C4 gate **checks** `user.emailVerified` but the verification **mechanism was never built** — nothing in the codebase ever sets `emailVerified`, so it is `null` for every user (including all pre-existing org members; the migration added the column nullable with no backfill).

- Check, no setter: [src/app/api/polls/[slug]/roll/route.ts:63](../src/app/api/polls/[slug]/roll/route.ts#L63)
- Check, no setter (existing users): [src/app/api/polls/[slug]/distribute/route.ts:63](../src/app/api/polls/[slug]/distribute/route.ts#L63)
- Check, no setter (org members): [src/app/api/polls/[slug]/distribute/route.ts:120](../src/app/api/polls/[slug]/distribute/route.ts#L120)
- Signup never sets it: [src/app/signup/page.tsx](../src/app/signup/page.tsx) — `prisma.user.create({ data: { email, name, passwordHash } })`
- No `/verify-email` route, no verification email, no verification token anywhere.

Pick **Option A** (recommended now — unblocks voting immediately) **or** **Option B** (the real C4 feature). Do not ship the current half-state.

---

### Option A — Revert the gate, reopen C4 (recommended, ~15 min)

A half-built gate that breaks all voting is strictly worse than no gate. Remove the three checks; reopen C4 as "needs verification flow."

**Step 1.** In [src/app/api/polls/[slug]/roll/route.ts](../src/app/api/polls/[slug]/roll/route.ts), delete this block (currently ~lines 63–68):
```ts
  if (!user.emailVerified) {
    return NextResponse.json(
      { error: 'User must verify their email before being added to the voter roll' },
      { status: 400 },
    )
  }
```

**Step 2.** In [src/app/api/polls/[slug]/distribute/route.ts](../src/app/api/polls/[slug]/distribute/route.ts), delete the existing-user check (~lines 63–66):
```ts
        if (!user.emailVerified) {
          results.errors.push(`${normalizedEmail} has not verified their email`)
          continue
        }
```
and the org-member check (~lines 120–123):
```ts
      if (!user.emailVerified) {
        results.errors.push(`${user.email} has not verified their email`)
        continue
      }
```
Leave the `if (!user)` not-found guard that sits next to the org-member check — only remove the `emailVerified` block.

**Step 3.** Reopen the tracker item. In `PLAN.md` and `.agent/CONTINUITY.md`, change Milestone 5 **C4** from `[x]` back to `[ ]` and append: "gate reverted — needs real verification flow (see docs/MILESTONE-5-REMEDIATION.md FIX-1 Option B)." Update Milestone 5 status from "Complete" to "In Progress."

**Step 4 — keep `emailVerified` in the schema.** Do **not** drop the column; Option B will use it. The `User` model in [prisma/schema.prisma](../prisma/schema.prisma) keeps `emailVerified DateTime?`.

#### Verify Option A
1. `pnpm test` — still green (no tally impact).
2. Manual: start the app (`pnpm dev` with a DB; `docker-compose up -d` for Postgres). As a poll admin, open a **draft** poll → voter-roll manager → add a registered user's email. **Expected:** user is added (201), no "verify email" error.
3. Manual: org poll distribution to "all members" adds members to the roll without rejection.

---

### Option B — Build the real verification flow (the actual C4 feature, larger)

Implement this if you want C4 genuinely done rather than deferred.

**Step 1 — verification token storage.** Add to [prisma/schema.prisma](../prisma/schema.prisma):
```prisma
model EmailVerificationToken {
  id        String   @id @default(uuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```
Add the back-relation `verificationTokens EmailVerificationToken[]` to `model User`. Then create a migration:
```bash
pnpm prisma migrate dev --name add_email_verification_token
```
(If migrations are hand-maintained for prod — see how `prisma/migrations/20260605170000_milestone_5_security_hardening/migration.sql` was authored with `IF EXISTS`/`IF NOT EXISTS` — mirror that style.)

**Step 2 — send a verification email on signup.** In [src/lib/email.ts](../src/lib/email.ts) add `sendVerificationEmail({ to, verifyLink })` mirroring `sendVoteInvite`. In [src/app/signup/page.tsx](../src/app/signup/page.tsx), after `prisma.user.create`, generate a raw token, store only its hash (reuse [src/lib/token.ts](../src/lib/token.ts) `hashToken`), set `expiresAt` to now + 24h, and email a link to `${NEXT_PUBLIC_APP_URL}/verify-email?token=<raw>`. Use `randomBytes(32).toString('hex')` for the raw token (same pattern as token generation).

**Step 3 — verification endpoint.** Add `src/app/api/verify-email/route.ts` (GET): read `token` from query, hash it, look up `EmailVerificationToken` by `tokenHash`, reject if missing or `expiresAt < now`, else in a transaction set `user.emailVerified = new Date()` and delete the token row. Add a small `/verify-email` page that calls it and shows success/failure.

**Step 4 — org invites.** Decide policy: either (a) auto-set `emailVerified` when a user accepts an org invite via the emailed link (they proved email control), or (b) require separate verification. Implement in the invite-acceptance path. Document the choice in `docs/SPEC.md`.

**Step 5 — keep the gate checks** that Option A removes (they become correct once the setter exists).

**Step 6 — rate-limit** the resend/verify endpoints using [src/lib/rate-limit.ts](../src/lib/rate-limit.ts) (see FIX-3 caveats).

#### Verify Option B
1. New unit test for token hashing/expiry helper if extracted.
2. Manual: sign up → receive email (or read the link from the mail provider log / SMTP catcher) → hit `/verify-email?token=…` → confirm `emailVerified` is set in DB → confirm the user can now be added to a roll.
3. Manual: expired token (set `expiresAt` in the past) → rejected. Reused/deleted token → rejected.

---

## FIX-2 — Double-vote race: atomic credential claim (CRITICAL)

### Impact
Two concurrent ballot requests carrying the **same** token (or same logged-in user) can both succeed, producing two ballots from one voter. A3 removed the database-level guarantee and replaced it with a check that is not concurrency-safe.

### Root cause
A3 dropped `@@unique([pollId, voterToken])` on `Ballot` (confirmed in the migration: `DROP INDEX … "Ballot_pollId_voterToken_key"`). One-vote-per-credential now relies on an application check (`voterToken.usedAt` / `onRoll.hasVoted`) read **outside** the transaction at [src/app/api/ballots/route.ts:112](../src/app/api/ballots/route.ts#L112) and :133, while the transaction at :143 marks the credential used **unconditionally** with `update` (not a conditional/guarded write). Between the read and the write, a second request passes the same check → double ballot.

### Fix
Make the credential claim **atomic** inside the transaction using a conditional `updateMany` (guarded by `usedAt: null` / `hasVoted: false`) and create the ballot only if exactly one row was claimed. Postgres' default read-committed isolation makes the second concurrent `updateMany` match zero rows once the first commits, so `count` distinguishes winner from loser.

Keep the existing pre-transaction checks (lines 108–135) — they give fast, friendly rejections — but they are no longer the integrity boundary.

**Step 1.** In [src/app/api/ballots/route.ts](../src/app/api/ballots/route.ts), add a sentinel error near the top of the file (after imports):
```ts
class AlreadyVotedError extends Error {}
```

**Step 2.** Replace the transaction body (currently lines 143–185) with a version that claims first, then creates:
```ts
    const ballot = await prisma.$transaction(async (tx) => {
      // Atomically claim the voting credential. The `where` guard ensures
      // only one of N concurrent requests for the same credential succeeds.
      if (token) {
        const tokenHash = hashToken(token)
        const claimed = await tx.voterToken.updateMany({
          where: { pollId: poll.id, tokenHash, usedAt: null },
          data: { usedAt: new Date() },
        })
        if (claimed.count !== 1) throw new AlreadyVotedError()
      } else if (session?.user?.id) {
        const claimed = await tx.voterRoll.updateMany({
          where: { pollId: poll.id, userId: session.user.id, hasVoted: false },
          data: { hasVoted: true, votedAt: new Date() },
        })
        if (claimed.count !== 1) throw new AlreadyVotedError()
      }

      const receipt = generateReceipt()
      const b = await tx.ballot.create({
        data: {
          pollId: poll.id,
          rankings: rankings as unknown as string[],
          receiptCode: receipt,
        },
      })

      await auditLog({
        pollId: poll.id,
        action: 'ballot_cast',
        detail: `Ballot cast at ${new Date().toISOString()}`,
        tx,
      })

      return b
    })
```

**Step 3.** Update the `catch` (currently ~line 195) to map the sentinel to a 409 instead of a generic 500:
```ts
  } catch (error) {
    if (error instanceof AlreadyVotedError) {
      return NextResponse.json(
        { error: 'You have already voted in this poll' },
        { status: 409 },
      )
    }
    console.error('Ballot creation error:', error)
    return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 })
  }
```

> Note: `updateMany` returns `{ count }` and never throws on zero matches, which is why we check `count !== 1`. A bare `update` would throw `P2025` on a missing row — `updateMany` keeps the control flow explicit.

### Verify FIX-2
**Automated (recommended — adds the project's first route test):**
Add `src/app/api/ballots/__tests__/double-vote.test.ts`. Because the handler imports `@/lib/prisma`, either (a) mock the Prisma client and assert that the second concurrent call with the same token throws `AlreadyVotedError` / returns 409, or (b) run against a test database. Minimal integration sketch against a test DB:
1. Seed a draft→open poll with 1 token.
2. Fire two `POST /api/ballots` with the same token concurrently (`Promise.all`).
3. Assert exactly one `201` and one `409`, and `prisma.ballot.count({ where: { pollId } })` === 1.

**Manual race check (no test infra needed):**
```bash
# open poll with a known token $T and slug $S, app on :3000
seq 2 | xargs -P2 -I{} curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST http://localhost:3000/api/ballots \
  -H 'Content-Type: application/json' \
  -d "{\"pollSlug\":\"$S\",\"token\":\"$T\",\"rankings\":[\"<optionId>\"]}"
```
Expect one `201` and one `409` (or `429` if rate-limited — lower concurrency or wait out the window). Then confirm in DB: exactly one ballot for that poll, token `usedAt` set once.

**Regression:** `pnpm test` stays green; normal single-vote flow still returns 201 with a receipt.

---

## FIX-3 — Rate limiter: document/limit its scope (MEDIUM)

### Impact / root cause
[src/lib/rate-limit.ts](../src/lib/rate-limit.ts) is an in-process `Map`. It only works for a **single long-lived instance** (the docker-compose deployment). On serverless/multi-instance it resets on cold start and isn't shared, so limits are far weaker than they appear. Two further sharp edges:
- IP comes from `x-forwarded-for`, which is client-spoofable unless a trusted proxy overwrites it.
- The login limiter wraps **all** NextAuth `POST`s (signin, signout, session, callback) at 5 per 5 min per IP — users behind shared NAT can be locked out of normal flows: [src/app/api/auth/[...nextauth]/route.ts](../src/app/api/auth/[...nextauth]/route.ts).

### Fix
**Step 1 (minimum).** Add a header comment to [src/lib/rate-limit.ts](../src/lib/rate-limit.ts) stating the single-instance assumption and that a shared store (e.g. Redis/Upstash) is required for multi-instance/serverless. Note it in `docs/ARCHITECTURE.md`.

**Step 2 (recommended).** Narrow the auth limiter to credential sign-in only, so signout/session aren't throttled. In the `POST` wrapper, only apply the limit when the request targets the credentials callback (inspect the `nextauth` path segment / action), otherwise delegate straight to `handlers.POST`. Verify by signing out repeatedly (should never 429) vs. >5 bad logins in 5 min from one IP (should 429).

**Step 3 (optional).** Trust `x-forwarded-for` only behind a known proxy; otherwise prefer the platform-provided client IP. Document the deployment assumption.

### Verify FIX-3
- >5 failed logins in 5 min from one IP → `429`; a 6th legitimate signout/session POST in that window → **not** 429 (after Step 2).
- Comment/docs present.

---

## FIX-4 — Approval voting tie-break (MEDIUM)

### Impact / root cause
C1 added deterministic tie-breaks to RCV ([src/lib/tally.ts](../src/lib/tally.ts)) and STV ([src/lib/stv.ts](../src/lib/stv.ts)), but **approval voting was not touched**. In [src/lib/approval.ts:29](../src/lib/approval.ts#L29) the sort is `.sort((a, b) => b.count - a.count)`; when a tie straddles the `seats` cutoff (line 31 `slice(0, seats)`), which candidate wins the last seat depends on input/sort order rather than a documented rule.

### Fix
**Step 1.** In [src/lib/approval.ts](../src/lib/approval.ts), make the sort deterministic with a documented secondary key (match the RCV/STV convention of lexicographically-smallest `optionId` winning ties):
```ts
  const voteList: VoteCount[] = options
    .map((o) => ({
      optionId: o.id,
      label: o.label,
      count: counts.get(o.id) || 0,
    }))
    // Deterministic tie-break: higher count first, then smallest optionId.
    .sort((a, b) => b.count - a.count || a.optionId.localeCompare(b.optionId))
```

**Step 2.** Document the rule wherever RCV/STV tie-breaks are documented (e.g. `docs/SPEC.md`), so all three methods state the same convention.

### Verify FIX-4
**Automated:** add a case to [src/lib/__tests__/tally.test.ts](../src/lib/__tests__/tally.test.ts) (or a new `approval.test.ts`): two candidates tied at the seat boundary with `seats: 1` → assert the lexicographically-smaller `optionId` is elected, and that the result is stable across input reordering. Run `pnpm test`.

---

## FIX-5 — Cosmetic: dead secret check in `generateReceipt` (LOW)

### Root cause
In [src/app/api/ballots/route.ts](../src/app/api/ballots/route.ts) `generateReceipt()` throws if `AUTH_SECRET` is missing, then ignores it and returns `randomBytes(16)`. The real fail-fast already lives in [src/lib/env.ts](../src/lib/env.ts) (imported by [src/app/layout.tsx](../src/app/layout.tsx)), so the check is misleading.

### Fix
Drop the unused `secret` lookup so the function is just:
```ts
function generateReceipt(): string {
  return randomBytes(16).toString('hex')
}
```
Leave `src/lib/env.ts` as the single source of the `AUTH_SECRET` requirement.

### Verify FIX-5
`pnpm test` green; casting a vote still returns a 32-char hex `receiptCode`.

---

## Tracker note
`PLAN.md` and `.agent/CONTINUITY.md` currently mark all of Milestone 5 `[x]` / "Complete." That is inaccurate while FIX-1 and FIX-2 are open. After applying fixes, update both: keep A1/A2/A3*/B1/B2/B3/C2/C3 as done, and reflect C4 (FIX-1) and the C1 approval gap (FIX-4) honestly. (*A3's privacy model is correct; FIX-2 restores the integrity guarantee it inadvertently dropped.)

## Suggested implementation order & branching
Per `AGENTS.md`: this is multi-file, so work on a branch (e.g. `fix/milestone-5-remediation`), conventional commits, PR for review — do not merge to `main` locally.
1. FIX-2 (atomic claim) — highest integrity value, self-contained.
2. FIX-1 Option A (unblock voting) — or Option B if doing the full feature.
3. FIX-4, FIX-3, FIX-5.
Run `pnpm test` after each; add the route-level tests noted in FIX-2 to give this area its first automated coverage.
