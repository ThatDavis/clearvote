# Deployment

ClearVote is designed to be self-hosted as a single long-lived container next to PostgreSQL, using Docker Compose. For local development instead, see [Development Setup](Development-Setup.md).

## Prerequisites

- Docker and Docker Compose
- A GitHub personal access token (to pull the image from GHCR)

## Deploy

```bash
# 1. Clone the repository
git clone https://github.com/ThatDavis/clearvote.git
cd clearvote

# 2. Copy and configure environment variables
cp .env.example .env
# edit .env (see below)

# 3. Start with Docker Compose
docker compose -f docker-compose.prod.yml up -d
```

The application will be available at `http://localhost:3000`. Put it behind a TLS-terminating reverse proxy for public use and set `NEXT_PUBLIC_APP_URL` to the public URL.

## Environment variables

**Required** (the container will not start without these):

| Variable | Purpose |
|----------|---------|
| `DB_PASSWORD` | PostgreSQL password |
| `AUTH_SECRET` | Random string for JWT signing (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | Public URL of your instance |

**Optional:**

| Variable | Default | Purpose |
|----------|---------|---------|
| `DB_USER` | `clearvote` | PostgreSQL username |
| `DB_NAME` | `clearvote` | PostgreSQL database name |
| `EMAIL_PROVIDER` | `resend` | `resend` or `smtp` |
| `RESEND_API_KEY` | - | API key for Resend |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | - | SMTP server details |

`DATABASE_URL` is constructed automatically from `DB_USER`, `DB_PASSWORD`, and `DB_NAME`. See `docker-compose.prod.yml` for the complete, authoritative list.

> Email is used for verification and invites. Configure either Resend (`RESEND_API_KEY`) or SMTP (`SMTP_*`) or those flows will fail.

## How the image is built

- **Multi-stage Dockerfile** produces an optimized production image with layer caching.
- **GitHub Actions** runs tests, lint, and vulnerability scans on each change, then builds and publishes images to **GHCR**, tagged with the **git SHA** and **semver**. Pin to a specific tag in production rather than `latest`.
- `docker-entrypoint.sh` runs database migrations on container start, so deploying a new image applies pending migrations.

## Updating

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Scaling caveat

The in-process rate limiter is correct only for a **single** long-lived instance. Running multiple instances or a serverless platform requires a shared store (e.g. Redis/Upstash). See [Architecture](Architecture.md#rate-limiting-is-in-process).

## Related

- [Development Setup](Development-Setup.md) - run locally
- [Security Model](Security-Model.md) - what to protect in production (secrets, tokens, audit log)
