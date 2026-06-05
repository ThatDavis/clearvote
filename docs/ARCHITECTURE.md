# Architecture — clearvote

> Last updated: 2026-06-04

## Stack Decisions

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript | Full-stack type safety, one language for frontend and backend |
| Framework | Next.js 16 (App Router) | API routes + React in one project; auth, middleware, SSR built in |
| Database | PostgreSQL | Relational model maps perfectly to polls, ballots, users; constraints and transactions for vote integrity |
| ORM | Prisma 7 | Type-safe queries, excellent migrations, strong Postgres support |
| Frontend | React 19 | Ships with Next.js |
| CSS | Tailwind CSS 4 | Utility-first, fast iteration on forms and dashboards |
| Testing | Vitest | Fast, Vite-native, excellent TypeScript support |
| Linting | Biome | All-in-one linting + formatting, fast, single config |
| Hosting | Docker Compose | Self-hosted, reproducible dev and prod environments |
| Package Manager | pnpm | Fast, strict, recommended for Next.js |
| CI/CD | GitHub Actions | Free for public repos, easy Docker builds and test runs |

## Project Structure

```
rank/
  src/
    app/           # Next.js App Router — pages, layouts, API routes
    generated/     # Generated code — Prisma client output
    test/          # Test utilities and setup (vitest)
  prisma/
    schema.prisma  # Database models
    migrations/    # Prisma migration history
  docs/
    adr/           # Architecture Decision Records
    SPEC.md        # Feature specifications with acceptance criteria
    ARCHITECTURE.md # This file
  public/          # Static assets (images, favicon)
  docker-compose.yml # PostgreSQL and app container orchestration
```

### Directory Rationale
- `src/app/` follows Next.js App Router conventions — file-based routing with co-located layouts and API endpoints
- `src/generated/` is generated code (Prisma client) — kept separate from hand-written code
- `prisma/` holds all database concerns in one place
- `docs/` is documentation, not code — no imports from here

## Key Design Decisions

### Rate Limiting
The current rate limiter (`src/lib/rate-limit.ts`) is an in-process `Map`. It works correctly for the Docker Compose deployment (single long-lived instance) but is **not suitable for serverless or multi-instance deployments** because the store resets on cold starts and is not shared across instances. A shared store (e.g. Redis / Upstash) is required for those environments.

The auth rate limiter (`src/app/api/auth/[...nextauth]/route.ts`) is narrowed to credential sign-in callbacks only, so signout and session requests are not throttled.

## Architecture Decision Records

- `docs/adr/` — *No ADRs yet.*

## Open Design Questions

*None yet.*
