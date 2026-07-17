<p align="center">
  <img src="logo.svg" alt="ClearVote logo" width="120" />
</p>

# ClearVote

A voting system for community-run spaces. Supports ranked-choice, approval, and yes/no voting methods with full audit trails.

## Why ClearVote exists

Most voting tools are either too simple (Google Forms) or too complex (enterprise election software). ClearVote targets the middle: organizations that need credible elections without a PhD in cryptography.

## How it works

### Voting methods

- **Ranked-choice (RCV)**: Instant-runoff for single-winner elections
- **Single transferable vote (STV)**: Multi-winner with fractional surplus transfer
- **Approval**: Select any number of options
- **Yes/No**: Simple majority or configurable threshold

### Security model

Rather than trust a single administrator, ClearVote separates roles and provides auditability:

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

The fastest way to run ClearVote is with Docker Compose.

### Prerequisites

- Docker and Docker Compose
- A GitHub personal access token (to pull from GHCR)

### Deploy

```bash
# 1. Clone the repository
git clone https://github.com/ThatDavis/ClearVote.git
cd ClearVote

# 2. Copy and configure environment variables
cp .env.example .env
# Edit .env with your values (see Environment variables below)

# 3. Start with Docker Compose
docker compose -f docker-compose.prod.yml up -d
```

The application will be available at `http://localhost:3000`.

### Environment variables

Required (the container will fail to start without these):

| Variable | Purpose |
|----------|---------|
| `DB_PASSWORD` | PostgreSQL password |
| `AUTH_SECRET` | Random string for JWT signing (generate with `openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | Public URL of your instance |

Optional:

| Variable | Default | Purpose |
|----------|---------|---------|
| `DB_USER` | `clearvote` | PostgreSQL username |
| `DB_NAME` | `clearvote` | PostgreSQL database name |
| `EMAIL_PROVIDER` | `resend` | Email provider (`resend` or `smtp`) |
| `RESEND_API_KEY` | - | API key for Resend |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | - | SMTP server details |

The `DATABASE_URL` is constructed automatically from `DB_USER`, `DB_PASSWORD`, and `DB_NAME`. See `docker-compose.prod.yml` for the complete list.

### Updating

Pull the latest image and restart:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Admin setup

After deploying, promote your first system admin so you can manage users from the `/admin` dashboard:

**Docker deployment:**

```bash
docker compose -f docker-compose.prod.yml exec db \
  psql -U clearvote -d clearvote \
  -c "UPDATE \"User\" SET role = 'admin' WHERE email = 'alice@example.com';"
```

**Development:**

```bash
pnpm tsx scripts/make-admin.ts alice@example.com
```

This sets `User.role = 'admin'` for the given email. Once the first admin exists, further admin actions (password resets, account deletion) can be done from the UI at `/admin`. See the [Security Model](wiki/Security-Model.md#authentication-and-authorization) for details.

## Development setup

```bash
pnpm install
docker compose up -d          # start PostgreSQL
cp .env.example .env          # set DATABASE_URL + AUTH_SECRET
pnpm db:migrate               # apply migrations
pnpm db:generate              # generate Prisma client
pnpm dev                     # http://localhost:3000
```

Promote a user to system admin after signing up:

```bash
pnpm tsx scripts/make-admin.ts alice@example.com
```

(Docker deployments: use the SQL command in [Admin setup](#admin-setup) above.)

See the [development setup guide](wiki/Development-Setup.md) for full details.

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

See the [project wiki](wiki/) for detailed documentation, including [architecture decisions](wiki/Architecture.md), the [tally algorithm implementation](wiki/Tally-Algorithms.md), the [security model](wiki/Security-Model.md), the [data model](wiki/Data-Model.md), and [deployment](wiki/Deployment.md) and [development](wiki/Development-Setup.md) guides.

## License

MIT
