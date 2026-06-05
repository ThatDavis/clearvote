# Specification — clearvote

> Last updated: 2026-06-04

## Overview

clearvote is a web application that lets community-run spaces (co-ops, HOAs, unions, clubs) run secure, fair elections using ranked-choice voting. Voters can participate via anonymous one-time links or through authenticated accounts with full vote management.

## Milestone 1 — Core Voting Engine

### Features

#### Feature: Create a poll
**Description:** An administrator creates a new poll with a title, description, and list of options. The system generates a unique slug for sharing.
**Acceptance Criteria:**
- [ ] Form accepts title (required), description (optional), and options (2+ required)
- [ ] Slug is auto-generated from title and guaranteed unique
- [ ] Poll is created with status "draft"

#### Feature: Generate voter tokens
**Description:** The admin generates a set of unique one-time-use tokens that can be shared as links for anonymous voting.
**Acceptance Criteria:**
- [ ] Tokens are cryptographically random and unique per poll
- [ ] Each token can only be used to cast one ballot
- [ ] Tokens can be generated in batches

#### Feature: Cast a ranked-choice vote
**Description:** A voter receives a token link, opens it, and ranks the options in order of preference. The ballot is submitted and stored.
**Acceptance Criteria:**
- [ ] Voter sees all poll options and can rank them
- [ ] Ranking can be done via drag-and-drop or numbered inputs
- [ ] Ballot is stored with the ranking as an ordered array
- [ ] Duplicate votes with the same token are rejected

#### Feature: Instant-runoff tally
**Description:** When a poll closes, the system computes the winner using standard RCV instant-runoff logic.
**Acceptance Criteria:**
- [ ] Algorithm handles majority wins in first round
- [ ] Algorithm eliminates last-place candidates and redistributes votes
- [ ] Algorithm handles ties at elimination boundaries
- [ ] Algorithm handles exhausted ballots (no remaining preferences)
- [ ] Results are reproducible from the raw ballot data

#### Feature: Poll status lifecycle
**Description:** Polls move through draft → open → closed states.
**Acceptance Criteria:**
- [ ] Draft: not visible to voters, can be edited
- [ ] Open: accepts ballots from valid tokens
- [ ] Closed: no new ballots, results visible publicly

---

## Future Milestones
- **M2:** Auth, voter rolls, one-vote-per-person enforcement
- **M3:** Dashboards, multi-winner STV, deadlines, proxy voting

## Tie-Breaking Convention

All voting methods (RCV, STV, and approval) use the same deterministic tie-breaker: **when candidates are tied, the lexicographically smallest `optionId` wins the tie.** This ensures reproducible results regardless of input order or database insertion order.

## Non-Functional Requirements
- All election results must be verifiable from raw anonymized ballot data
- Tally algorithm must be correct for all edge cases (ties, exhausted ballots, surplus transfers)
- UI must be accessible (WCAG 2.1 AA)

## Open Questions
- [ ] Should we support "equal ranking" (where a voter can rank two candidates at the same position)? — Owner: TBD, Due: TBD
- [ ] Should ballot data be published in full (anonymized) for public audit? — Owner: TBD, Due: TBD
