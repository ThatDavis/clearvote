# Development Setup

How to run ClearVote locally for development. For self-hosting in production, see [Deployment](Deployment.md).

## Prerequisites

- **Node.js** 20+
- **pnpm** (the project's package manager)
- **Docker + Docker Compose** (easiest way to run PostgreSQL locally)

## 1. Install dependencies

```bash
pnpm install
```

## 2. Start PostgreSQL

The dev compose file runs just the database:

```bash
docker compose up -d
```

## 3. Configure environment

```bash
cp .env.example .env
# edit .env
```

At minimum you need a `DATABASE_URL` pointing at the Postgres above and an `AUTH_SECRET`:

```bash
# generate a signing secret
openssl rand -base64 32
```

See [Deployment](Deployment.md#environment-variables) for the full list of variables and how `DATABASE_URL` is assembled in production.

## 4. Set up the database

```bash
pnpm db:migrate     # apply migrations (prisma migrate dev)
pnpm db:generate    # generate the Prisma client into src/generated
```

`pnpm db:studio` opens Prisma Studio to browse data.

## 5. Run the app

```bash
pnpm dev
```

The app runs at `http://localhost:3000`.

## Everyday scripts

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Next.js dev server |
| `pnpm build` / `pnpm start` | production build / serve |
| `pnpm test` | run the Vitest suite once |
| `pnpm test:watch` | watch mode |
| `pnpm lint` | Biome check |
| `pnpm lint:fix` | Biome check with `--write` |
| `pnpm format` | Biome format `--write` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:migrate` | create/apply a dev migration |
| `pnpm db:generate` | regenerate the Prisma client |
| `pnpm db:studio` | open Prisma Studio |

## Before you push

Run the same checks CI runs:

```bash
pnpm lint && pnpm typecheck && pnpm test
```

See [Contributing](Contributing.md) for code style, commit conventions, and testing expectations, and [Architecture](Architecture.md) for how the project is laid out.
