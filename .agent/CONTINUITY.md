# CONTINUITY — rank

> Canonical project briefing. Read at session start.
> Stack: TypeScript + Next.js + PostgreSQL
> Type: Web app (full-stack)

## [PLANS]

### Milestone 1: Core Voting Engine (In Progress)
Goal: Anonymous polls with ranked-choice voting and instant-runoff tally.
- [ ] Create a poll with title, description, and options
- [ ] Generate unique voter token links for anonymous voting
- [ ] Cast a ranked-choice vote
- [ ] View results with standard RCV instant-runoff tally
- [ ] Poll status lifecycle (draft → open → closed)
- [ ] Public results page with anonymized ballot data
- [ ] Vote receipts for voter verification

### Future Milestones
- Milestone 2 — Auth & Voter Integrity: user accounts, authenticated voting, one-vote-per-person
- Milestone 3 — Vote & Voter Management: dashboards, multi-winner STV, deadlines, proxy voting

### Open Questions
- [ ] Should we support "equal ranking" where a voter gives two candidates the same rank?
- [ ] Should full anonymized ballot data be published for public audit?

## [DECISIONS]

- 2026-06-04: Initial stack — TypeScript + Next.js + PostgreSQL + Prisma + Tailwind + Vitest + Biome. Rationale: full-stack in one language, RDBMS for ballot integrity, mature ecosystem.
- 2026-06-04: Deep-plan validated scaffold. Planned features: anonymous polls with RCV (M1), auth + voter integrity (M2), dashboards + STV (M3). Added auditability, multi-winner STV, vote receipts, timed polls, and proxy voting to roadmap.

## [PROGRESS]

| Date | What was done |
|------|---------------|
| 2026-06-04 | Initial scaffold. Stack: TypeScript + Next.js + PostgreSQL + Prisma + Tailwind + Vitest + Biome + Docker Compose. |

## [DISCOVERIES]

*None yet.*

## [OUTCOMES]

*None yet.*
