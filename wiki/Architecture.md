# Architecture

ClearVote is a single Next.js application that serves both the UI and the API, backed by PostgreSQL. It is built to be self-hosted as one long-lived container next to a database.

## Stack decisions

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript (strict) | Full-stack type safety, one language for frontend and backend |
| Framework | Next.js 16 (App Router) | API routes + React in one project; auth, middleware, and server components built in |
| Database | PostgreSQL | Relational model maps cleanly to polls, ballots, users; constraints and transactions protect vote integrity |
| ORM | Prisma 7 | Type-safe queries, first-class migrations, strong Postgres support |
| Frontend | React 19 | Ships with Next.js; server components reduce client JS on voting pages |
| Auth | Auth.js (NextAuth v5 beta) | JWT sessions, no server-side session store to operate |
| CSS | Tailwind CSS 4 | Utility-first, fast iteration on forms and dashboards |
| Testing | Vitest | Fast, Vite-native, strong TypeScript support |
| Lint/format | Biome | One tool for linting and formatting (not Prettier/ESLint) |
| Hosting | Docker Compose | Reproducible self-hosted dev and prod |
| Package manager | pnpm | Fast and strict |
| CI/CD | GitHub Actions + GHCR | Tests, lint, and vulnerability scans; images tagged with git SHA and semver |

## Why these tradeoffs

- **Server components for voting pages** keep client-side JavaScript small, which matters for the public-facing ballot pages voters actually load.
- **JWT sessions** mean there is no session table to provision or scale; the cost is that sessions cannot be revoked server-side before expiry.
- **PostgreSQL + Prisma** gives relational integrity for ballots and uses `prisma.$transaction` for the atomic operations that vote integrity depends on.
- **Docker multi-stage build** produces an optimized production image with layer caching.

## Project structure

```
src/
  app/              # Next.js App Router: pages, layouts, API routes (app/api)
  components/       # Shared React components
  lib/              # Business logic: prisma, auth, tally algorithms, email, audit
  generated/        # Prisma client output (generated, not committed)
  middleware.ts     # Route protection
  auth.ts           # Auth.js configuration
prisma/
  schema.prisma     # Database schema
  migrations/       # Migration history
public/             # Static assets
docs/               # In-repo design notes (ADRs, specs, milestone plans)
```

### Directory rationale

- `src/app/` follows App Router conventions: file-based routing with co-located layouts and `api/` endpoints.
- `src/lib/` is the pure business logic. The tally algorithms here are deliberately decoupled from the database so they can be unit-tested against raw ballot data. See [Tally Algorithms](Tally-Algorithms.md).
- `src/generated/` is generated Prisma client code, kept separate from hand-written code and not committed.
- `docs/` is documentation, not code - nothing imports from it.

## Key design decisions

### Tally engines are pure functions

Every counting method (`tally.ts`, `stv.ts`, `approval.ts`, `yesno.ts`) takes plain options and ballots and returns a result. They never touch Prisma. This makes results **reproducible from raw anonymized ballot data**, which is a core non-functional requirement, and keeps the algorithms exhaustively unit-tested for edge cases (ties, exhausted ballots, surplus transfers).

### Tie-breaking by voter preference

Tie-breaking reflects voter preference rather than candidate or database identifiers: elimination ties use a **Next-Preference Cascade** over the ballots, and a genuine tie with no voter signal is broken impartially by a **reproducible lot** seeded from the ballot data. Results stay reproducible regardless of input order. See [Tally Algorithms](Tally-Algorithms.md#tie-breaking).

### Rate limiting is in-process

The rate limiter (`src/lib/rate-limit.ts`) is an in-process `Map`. It is correct for the single long-lived Docker Compose deployment but is **not suitable for serverless or multi-instance** setups, where the store resets on cold starts and is not shared. A shared store (e.g. Redis/Upstash) would be required there. The auth rate limiter is narrowed to credential sign-in callbacks, so signout and session requests are not throttled.

### Polls and elections

A standalone ballot is a `Poll`. A multi-contest ballot is an `Election` that contains several `Poll` rows as contests (`Poll.electionId`). This reuses every tally engine and most admin UI. See [Elections](Elections.md) and [Data Model](Data-Model.md).

## Related

- [Security Model](Security-Model.md) for the secrecy and audit guarantees that shape the schema.
- [Data Model](Data-Model.md) for the tables and relations.
