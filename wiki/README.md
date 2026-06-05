# ClearVote Wiki

**ClearVote** is a voting system for community-run spaces (co-ops, HOAs, unions, clubs). It supports ranked-choice, STV, approval, and yes/no voting methods with full audit trails, ballot secrecy, and verifiable results.

This wiki holds the detailed documentation referenced from the project README: architecture decisions, the tally algorithm implementations, the security model, and deployment guides.

## Start here

- **[Architecture](Architecture.md)** - stack choices, project structure, and key design decisions
- **[Voting Methods](Voting-Methods.md)** - what each method is and when to use it
- **[Tally Algorithms](Tally-Algorithms.md)** - how each method is counted, with the actual implementation
- **[Security Model](Security-Model.md)** - ballot secrecy, token hashing, receipts, and audit logging
- **[Data Model](Data-Model.md)** - the database schema and how the tables relate
- **[Elections](Elections.md)** - multi-poll ballots (Milestone 6) and cross-contest secrecy

## Running and building

- **[Development Setup](Development-Setup.md)** - run ClearVote locally for development
- **[Deployment](Deployment.md)** - self-host with Docker Compose
- **[API Reference](API-Reference.md)** - HTTP endpoints
- **[Contributing](Contributing.md)** - code style, conventions, and testing expectations

## At a glance

| | |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript (strict) |
| Database | PostgreSQL via Prisma 7 |
| Auth | Auth.js (NextAuth v5), JWT sessions |
| Styling | Tailwind CSS 4 |
| Tests | Vitest |
| Lint/format | Biome |
| Packaging | Docker multi-stage build, pnpm |

> This wiki is maintained alongside the code. When you change a tally algorithm, the schema, or a security guarantee, update the matching page in the same pull request.
