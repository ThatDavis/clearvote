# Data Model

The schema lives in `prisma/schema.prisma` (PostgreSQL via Prisma 7). This page summarizes the tables and how they relate. The design follows the guarantees in [Security Model](Security-Model.md) - notably that ballots carry no voter identity.

## Entity overview

```
Organization 1─* OrganizationMember *─1 User
Organization 1─* OrganizationInvite
Organization 1─* Poll
Organization 1─* Election 1─* Poll (contests)

User 1─* Poll (creator)
User 1─* EmailVerificationToken

Poll 1─* PollOption
Poll 1─* Ballot
Poll 1─* VoterToken
Poll 1─* VoterRoll *─1 User
Poll 1─* AuditLog

Election 1─* ElectionVoterToken
Election 1─* ElectionVoterRoll *─1 User
Election 1─* ElectionReceipt
Election 1─* ElectionAuditLog
```

## Core tables

### Organization, OrganizationMember, OrganizationInvite
Multi-tenant grouping. Members have a `role` of `admin` or `member`. Invites store only a `tokenHash` and expire (`expiresAt`).

### User
`email` (unique), `name`, `passwordHash` (bcrypt), and `emailVerified` (nullable timestamp - verification is required).

### Poll
The central object. A standalone poll has `electionId = null`; a poll with an `electionId` is a **contest** inside an [election](Elections.md). Key fields:

| Field | Meaning |
|-------|---------|
| `slug` | unique, used in public URLs |
| `votingMethod` | `rcv` \| `stv` \| `approval` (default `rcv`) |
| `seats` | winners for STV/approval (default 1) |
| `threshold` | pass % for yes/no (default 50) |
| `status` | `draft` \| `open` \| `closed` (lifecycle) |
| `startsAt` / `endsAt` | optional scheduling window |
| `creatorId` / `organizationId` | ownership (both nullable) |

### PollOption
The choices on a ballot. `label` plus an `order` for display.

### Ballot
**Anonymous by design.** `rankings` is `Json` (an ordered array for RCV/STV/approval, or a `{optionId: "yes"\|"no"}` map for yes/no). `receiptCode` is a unique random code for voter verification; `verifiedAt` is optional. There is **no** foreign key to a user.

### VoterToken
Anonymous one-time-use voting credential. Stores `tokenHash` (unique per poll), not the token. `usedAt` enforces single use.

### VoterRoll
Authenticated eligibility. `@@unique([pollId, userId])` plus `hasVoted` / `votedAt` enforce one vote per person while keeping the ballot itself anonymous.

### AuditLog
Append-only event log per poll (`action`, optional `detail`, `createdAt`). Written via `src/lib/audit.ts`. See [Security Model](Security-Model.md#audit-logging).

## Election tables (Milestone 6)

An `Election` is a container for multiple `Poll` contests sharing one credential set. See [Elections](Elections.md) for the design rationale.

- **Election** - `slug`, `status`, scheduling, ownership; relations to contests (`Poll`), tokens, rolls, receipts, audit logs.
- **ElectionVoterToken / ElectionVoterRoll** - election-scoped equivalents of `VoterToken` / `VoterRoll`. Both carry a reserved nullable `ballotStyleId` (`null` = sees all contests) so ballot styles can be added later with no credential-table migration.
- **ElectionReceipt** - one receipt per ballot *package* (the whole multi-contest submission), not per contest. Not linked to individual `Ballot` rows.
- **ElectionAuditLog** - append-only log scoped to the election.

## Indexes and integrity

- Foreign keys use `onDelete: Cascade` where children should not outlive their parent (options, ballots, tokens, rolls, audit logs).
- Hot lookup columns are indexed (`@@index` on `pollId`, `organizationId`, `userId`, `electionId`).
- Uniqueness constraints back the one-vote / one-token guarantees.

## Migrations

History lives in `prisma/migrations/`:

- `init_complete_schema`
- `milestone_5_security_hardening`
- `add_org_invites`
- `add_email_verification`
- `add_election_models`

Use `pnpm db:migrate` (dev) to create/apply migrations and `pnpm db:generate` to regenerate the client. See [Development Setup](Development-Setup.md).
