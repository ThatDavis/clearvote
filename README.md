# rank

A simple ranked-choice voting system for community-run spaces.

## Stack

- **Language:** TypeScript
- **Runtime/Framework:** Next.js 16 (App Router)
- **Frontend:** React 19 (via Next.js)
- **Database:** PostgreSQL 17
- **ORM:** Prisma 7
- **CSS:** Tailwind CSS 4
- **Testing:** Vitest (+ Playwright later)
- **Hosting:** Docker Compose

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### Setup

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
docker compose up -d

# Copy environment variables
cp .env.example .env

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
```

### Running Tests

```bash
pnpm test
```

## Project Structure

```
rank/
  src/
    app/           # Next.js App Router pages
    generated/     # Generated code (Prisma client)
    test/          # Test setup and utilities
  prisma/
    schema.prisma  # Database schema
    migrations/    # Database migrations
  docs/
    adr/           # Architecture Decision Records
    SPEC.md        # Feature specifications
    ARCHITECTURE.md # Architecture decisions
  public/          # Static assets
```

## Features

*No features implemented yet. See [PLAN.md](PLAN.md) for the roadmap.*
