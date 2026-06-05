<p align="center">
  <img src="logo.svg" alt="clearvote logo" width="120" />
</p>

# clearvote

A voting system for community-run spaces. Supports ranked-choice, approval, and yes/no voting methods with full audit trails.

## Why clearvote exists

Most voting tools are either too simple (Google Forms) or too complex (enterprise election software). clearvote targets the middle: organizations that need credible elections without a PhD in cryptography.

## How it works

### Voting methods

- **Ranked-choice (RCV)**: Instant-runoff for single-winner elections
- **Single transferable vote (STV)**: Multi-winner with fractional surplus transfer
- **Approval**: Select any number of options
- **Yes/No**: Simple majority or configurable threshold

### Security model

Rather than trust a single administrator, clearvote separates roles and provides auditability:

- **Ballot secrecy**: Votes are stored without voter identity. A separate eligibility table prevents double-voting without linking ballots to users.
- **Token hashing**: Anonymous voting tokens are hashed with SHA-256 before storage. A database leak reveals nothing usable.
- **Random receipts**: Each ballot gets a random 128-bit receipt code for voter verification, not derived from any secret.
- **Audit logging**: Significant events (token generation, poll open/close, ballot cast) are logged append-only.

### Architecture

Built as a Next.js application with intentional tradeoffs:

| Decision | Rationale |
|----------|-----------|
| Next.js App Router | Server components reduce client-side JavaScript for voting pages |
| PostgreSQL + Prisma | Relational integrity for ballots; Prisma handles migrations and type safety |
| JWT sessions (Auth.js) | No server-side session storage simplifies deployment and scaling |
| Docker multi-stage build | Optimized production image with layer caching |
| GitHub Actions + GHCR | CI runs tests, lint, and vulnerability scans. Container images are tagged with git SHA and semver. |

## Quick start

The fastest way to run clearvote is with Docker Compose.

### Prerequisites

- Docker and Docker Compose
- A GitHub personal access token (to pull from GHCR)

### Deploy

```bash
# 1. Clone the repository
git clone https://github.com/ThatDavis/clearvote.git
cd clearvote

# 2. Copy and configure environment variables
cp .env.example .env
# Edit .env with your values (see Environment variables below)

# 3. Start with Docker Compose
docker compose -f docker-compose.prod.yml up -d
```

The application will be available at `http://localhost:3000`.

### Environment variables

Required variables (the container will fail to start without these):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random string for JWT signing (generate with `openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | Public URL of your instance |

Optional email configuration (for voter notifications):

| Variable | Purpose |
|----------|---------|
| `EMAIL_PROVIDER` | `resend` or `smtp` |
| `RESEND_API_KEY` | API key for Resend (cloud email) |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | SMTP server details |

See `docker-compose.prod.yml` for the complete list.

### Updating

Pull the latest image and restart:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Development

If you want to hack on clearvote locally:

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
docker compose up -d db

# Copy environment variables
cp .env.example .env

# Generate Prisma client and run migrations
pnpm db:generate
pnpm db:migrate

# Start development server
pnpm dev
```

### Running tests

```bash
pnpm test        # Unit tests
pnpm lint        # Lint check
pnpm typecheck   # TypeScript check
```

## Project structure

```
src/
  app/              # Next.js App Router (pages, API routes, layouts)
  components/       # Shared React components
  lib/              # Business logic (prisma, auth, tally algorithms, email)
  generated/        # Prisma client (generated, not committed)
prisma/
  schema.prisma     # Database schema
  migrations/       # Migration files
public/             # Static assets
```

## Contributing

See the project wiki for detailed documentation on architecture decisions, the tally algorithm implementation, and deployment guides.

## License

MIT
