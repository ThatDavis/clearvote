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

Tie-breaking is **never decided by candidate or database identifiers.** It either reflects voter preference or, as a last resort, is broken impartially by lot. The logic lives in `src/lib/tiebreak.ts`.

### Next-Preference Cascade (RCV and STV)

When candidates are tied for elimination, we ask the ballots who voters actually prefer among the tied candidates:

1. Restrict each ballot to just the still-tied candidates and find that voter's highest-ranked one - their preference within the tied set.
2. Sum that support per candidate (in STV, weighted by the ballot's current weight). The candidate(s) with the **least** support are the elimination candidates.
3. If that narrows to one, eliminate it. If it narrows to a smaller-but-still-tied subset, **cascade**: repeat step 1 on just that subset (ballots that backed a now-resolved candidate redistribute, which can separate the rest).
4. If the subset stops shrinking - every remaining candidate is preferred equally often - the voters give no further signal. Break that residual tie by lot (below).

This eliminates the candidate voters like least among those tied, using the whole ballot, and is blind to candidate id.

### Final fallback: reproducible lot

A genuine tie (e.g. a first-round 1-1-1, or perfectly symmetric ballots) has no voter signal to resolve it. It is broken **by lot**, drawn from a seed derived from the ballot data itself (`ballotSeed` + the seeded shuffle in `src/lib/shuffle.ts`). This is impartial like a coin toss, yet fully **reproducible** from the raw ballots - and still never uses a database id.

### Approval

Approval ballots carry no preference order, so a count tie has no cascade to run. Approval ties (including the seat cutoff and all-zero counts) go straight to the seeded lot.

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
5. Otherwise eliminate the lowest-count candidate (ties broken by the [Next-Preference Cascade](#tie-breaking)) and continue. The loop never eliminates the last remaining candidate(s).

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
- **Elimination**: if no one new is elected, the lowest non-elected candidate is eliminated (ties broken by the [Next-Preference Cascade](#tie-breaking), weighting each ballot by its current STV weight).
- Counts are rounded to 4 decimal places for display stability.
- The loop stops when `seats` are filled or candidates run out. If `seats <= 0` or `seats >= options.length`, `seats` is set to `options.length`.

---

## Approval - `tallyApproval`

Each ballot's `rankings` array is treated as an unordered set of approvals.

1. Count one vote per approved option.
2. Sort by `count desc`, breaking ties by the [seeded lot](#tie-breaking) (approval has no preference order to cascade through).
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
