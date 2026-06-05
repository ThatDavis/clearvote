# Security Model

Rather than trust a single administrator, ClearVote separates roles and makes elections auditable. The guarantees below shape the database schema (see [Data Model](Data-Model.md)) and the API behavior.

## Ballot secrecy

- **Votes are stored without voter identity.** The `Ballot` table holds `rankings` and a `receiptCode` but no link to a user.
- **Eligibility is tracked separately.** A `VoterRoll` (authenticated voters) or `VoterToken` (anonymous voters) records *that* a person voted, never *how*. This prevents double-voting without linking ballots to voters.
- **Display order is shuffled.** Ballots shown for audit are reordered with a seeded shuffle (`src/lib/shuffle.ts`) so storage order leaks nothing, while staying reproducible.

## Token hashing

Anonymous voting tokens are random, single-use links. Only their **SHA-256 hash** is stored (`src/lib/token.ts`, `hashToken`). A database leak therefore reveals no usable tokens.

- `VoterToken.tokenHash` is unique per poll (`@@unique([pollId, tokenHash])`).
- `usedAt` marks a token spent, enforcing one ballot per token.
- The same pattern protects org invites and email-verification tokens (`OrganizationInvite.tokenHash`, `EmailVerificationToken.tokenHash`).

## Random receipts

Each ballot gets a random 128-bit `receiptCode` for voter verification. It is **not derived from any secret** and is not linked to voter identity, so it lets a voter confirm their ballot was recorded without compromising secrecy.

## Audit logging

Significant events are written append-only to `AuditLog` via `src/lib/audit.ts`. Tracked actions:

`tokens_generated`, `poll_opened`, `poll_closed`, `voter_added`, `voter_removed`, `ballot_cast`, `results_viewed`.

`auditLog()` accepts an optional transaction client (`tx`) so the log entry is written **atomically** inside the same `prisma.$transaction` as the action it records.

## Authentication and authorization

- **Auth.js (NextAuth v5)** with JWT sessions - no server-side session store. Passwords are hashed with bcrypt.
- **Email verification** is required (`EmailVerificationToken`, `User.emailVerified`).
- **Route protection** is enforced in `src/middleware.ts`.
- **Admin checks**: privileged actions verify `canManagePoll` (and org membership/role) before proceeding. Never assume the caller is authorized.

## Rate limiting

`src/lib/rate-limit.ts` throttles abusive requests. It is an **in-process** store, correct for the single-instance Docker deployment but not shared across instances - see the caveat in [Architecture](Architecture.md#rate-limiting-is-in-process). The auth limiter is scoped to credential sign-in callbacks only.

## Operational rules (for contributors)

- Never log secrets or tokens.
- Always hash tokens before storage (SHA-256).
- Use `prisma.$transaction` for operations that must be atomic (casting a ballot + marking the token/roll + audit log).
- Validate all user input.
- Keep ballot data anonymous - no voter identity columns on `Ballot`.

See [Contributing](Contributing.md) for how these are enforced in review and tests, and [Elections](Elections.md#cross-contest-secrecy) for the additional secrecy rules that apply to multi-contest ballots.
