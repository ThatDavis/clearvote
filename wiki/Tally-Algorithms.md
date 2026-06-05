# Tally Algorithms

All tally engines live in `src/lib/` and are **pure functions**: they take options and ballots and return a result, with no database access. This keeps results reproducible from raw anonymized ballot data and makes every edge case unit-testable (`src/lib/__tests__/`).

Shared types (`src/lib/tally.ts`):

```ts
interface OptionInput { id: string; label: string }
type Ranking = string[]                 // ordered list of optionIds
interface BallotInput { rankings: Ranking }
interface VoteCount { optionId: string; label: string; count: number }
```

## Tie-breaking

Every method uses one deterministic rule so results never depend on input or insertion order:

> When candidates are tied, the **lexicographically smallest `optionId`** wins the tie.

For elimination ties (RCV/STV), the tied IDs are sorted and the smallest is the one eliminated. For approval, the sort is `count desc, then optionId asc`.

---

## Ranked-choice (RCV) - `tallyRcv`

Instant-runoff, single winner. Returns an array of `Round`s describing each elimination.

```ts
interface Round {
  round: number
  votes: VoteCount[]      // current counts, highest first
  eliminated: string[]    // optionIds eliminated this round
  exhausted: number       // ballots with no remaining ranked option
  winner?: string         // set on the round a winner is found
}
```

Algorithm, per round:

1. For each ballot, find the highest-ranked option not yet eliminated. If none, the ballot is **exhausted**.
2. `totalActive = ballots.length - exhausted`.
3. **Majority check**: `majorityThreshold = floor(totalActive / 2) + 1`. If the leader's count meets it, they win.
4. If only one candidate remains, they win.
5. Otherwise eliminate the lowest-count candidate (smallest `optionId` on a tie) and continue. The loop never eliminates the last remaining candidate(s).

Edge cases handled: first-round majority, exhausted ballots, elimination ties, and the guard against eliminating all remaining candidates.

---

## Single transferable vote (STV) - `tallyStv`

Multi-winner with fractional surplus transfer. Returns `StvRound[]`:

```ts
interface StvRound extends Round {
  quota: number
  elected: string[]       // optionIds elected this round
}
```

Key mechanics:

- **Droop quota**: `quota = floor(totalVotes / (seats + 1)) + 1`, computed once.
- **Ballot weights**: each ballot starts at weight `1`. Counts sum weights, not ballots.
- **Election**: any candidate reaching the quota is elected (up to `seats`).
- **Surplus transfer**: when an elected candidate has `surplus = count - quota > 0`, every ballot currently topped by that candidate is multiplied by `transferValue = surplus / count`. This passes only the *excess* value down to next preferences.
- **Elimination**: if no one new is elected, the lowest non-elected candidate is eliminated (smallest `optionId` on a tie).
- Counts are rounded to 4 decimal places for display stability.
- The loop stops when `seats` are filled or candidates run out. If `seats <= 0` or `seats >= options.length`, `seats` is set to `options.length`.

---

## Approval - `tallyApproval`

Each ballot's `rankings` array is treated as an unordered set of approvals.

1. Count one vote per approved option.
2. Sort by `count desc`, then `optionId asc` (tie-break).
3. The top `seats` options are `elected`.

Returns `{ votes, elected, totalVotes }`.

---

## Yes/No - `tallyYesNo`

Ballots here use a different shape - a map of `optionId -> "yes" | "no"`:

```ts
interface YesNoBallot { rankings: Record<string, string> }
```

For each option: tally `yes` and `no`, compute `pct = yes / (yes + no) * 100`, and mark `passed = total > 0 && pct >= threshold`. Each option is independent, so several can pass or fail on one ballot. Returns per-option `{ yesCount, noCount, passed }` plus `totalVotes`.

---

## Reproducibility and display shuffling

Results are deterministic given the same ballots. Where ballots are displayed (e.g. audit views), `src/lib/shuffle.ts` provides a **seeded** shuffle: the same seed always yields the same order, so display order is stable and reproducible without revealing storage order. This supports the ballot-secrecy goals in [Security Model](Security-Model.md).

## Testing

Tally logic is covered in `src/lib/__tests__/` (`tally.test.ts`, `stv.test.ts`, `approval.test.ts`). Per project convention, tests must cover ties, exhausted ballots, and empty inputs - see [Contributing](Contributing.md).
