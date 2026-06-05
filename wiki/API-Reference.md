# API Reference

ClearVote's HTTP API is implemented as Next.js App Router route handlers under `src/app/api/`. This page maps the available endpoints to their purpose. For exact request and response shapes, read the corresponding `route.ts` - it is the source of truth, and payloads are validated there.

> All privileged endpoints check authentication (`src/middleware.ts`, Auth.js) and authorization (org role / `canManagePoll`) before acting. State-changing vote operations run inside `prisma.$transaction` and write an [audit log](Security-Model.md#audit-logging) entry.

## Auth and account

| Route | Purpose |
|-------|---------|
| `api/auth/[...nextauth]` | Auth.js handler (sign in/out, session, callbacks). Credential sign-in is rate-limited. |
| `api/verify` | Verify a submitted credential/token |
| `api/verify-email` | Confirm an email address via an `EmailVerificationToken` |
| `api/resend-verification` | Re-send the email verification message |

## Polls

| Route | Purpose |
|-------|---------|
| `api/polls` | Create a poll; list polls |
| `api/polls/[slug]` | Read/update a single poll (status lifecycle, options) |
| `api/polls/[slug]/tokens` | Generate batches of anonymous voter tokens (stored hashed) |
| `api/polls/[slug]/roll` | Manage the authenticated voter roll |
| `api/polls/[slug]/distribute` | Distribute the poll to voters |
| `api/polls/[slug]/audit` | Read the append-only audit trail |

## Ballots

| Route | Purpose |
|-------|---------|
| `api/ballots` | Cast a ballot. Validates the token/roll eligibility, rejects double votes, stores the anonymous ballot with a random receipt code, marks the credential used, and audit-logs `ballot_cast` - all atomically. |

## Elections

| Route | Purpose |
|-------|---------|
| `api/elections` | Create/list elections (multi-contest ballots). See [Elections](Elections.md). |

## Organizations

| Route | Purpose |
|-------|---------|
| `api/orgs/[slug]` | Read/update an organization |
| `api/orgs/[slug]/members` | List/manage members |
| `api/orgs/[slug]/members/resend` | Re-send a member invite |
| `api/org/invite` | Accept/process an organization invite (token-hashed) |

## Conventions

- Tokens are never accepted or returned in plaintext beyond the single distribution link; only SHA-256 hashes are stored. See [Security Model](Security-Model.md#token-hashing).
- Results are computed from raw ballots by the pure tally engines, never precomputed and trusted. See [Tally Algorithms](Tally-Algorithms.md).
- Inputs are validated in the handler; never assume a payload is well-formed or the caller is authorized.
