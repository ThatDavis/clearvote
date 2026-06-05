# Contributing

These conventions come from `AGENTS.md` in the repo and are enforced in review and CI. See [Development Setup](Development-Setup.md) to get running.

## Code style

- TypeScript with **strict** mode; prefer explicit types over `any`.
- `async/await`, not callbacks.
- Handle errors explicitly; never swallow exceptions.
- Format and lint with **Biome** (not Prettier/ESLint): `pnpm lint`, `pnpm format`.

## Naming

- `kebab-case` for filenames
- `camelCase` for variables and functions
- `PascalCase` for components and types

## Text

- **No em dashes** in user-facing text or comments - use hyphens or rephrase.

## Git

- **Conventional commits**: `type(scope): description`.
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `build`.
- Keep commits atomic and focused.
- Never commit secrets or `.env` files.

## Testing

- Write tests for tally algorithms and API routes.
- Use **Vitest**.
- Test edge cases explicitly: ties, exhausted ballots, empty inputs. (See the existing suites in `src/lib/__tests__/`.)

## Security (non-negotiable)

- Never log secrets or tokens.
- Hash tokens before storage (SHA-256).
- Use `prisma.$transaction` for atomic operations.
- Validate all user input.
- Check `canManagePoll` (and org role) before admin actions.
- Keep ballot data anonymous - no voter identity on `Ballot`.

See [Security Model](Security-Model.md) for why each of these matters.

## Database

- Use Prisma migrations for schema changes (`pnpm db:migrate`).
- Add indexes for query performance.
- Keep ballot data anonymous (no voter identity).

## Before opening a PR

```bash
pnpm lint && pnpm typecheck && pnpm test
```

If your change touches a tally algorithm, the schema, or a security guarantee, **update the matching wiki page in the same PR** ([Tally Algorithms](Tally-Algorithms.md), [Data Model](Data-Model.md), [Security Model](Security-Model.md)).
