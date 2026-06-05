# Voting Methods

ClearVote supports four voting methods. The method is set per poll (`Poll.votingMethod`) and determines both the ballot UI and the tally engine. For the counting details and code, see [Tally Algorithms](Tally-Algorithms.md).

| Method | `votingMethod` | Winners | Ballot looks like | Use when |
|--------|----------------|---------|-------------------|----------|
| Ranked-choice (RCV) | `rcv` | Single | Ordered ranking of options | One seat, you want a majority winner |
| Single transferable vote (STV) | `stv` | Multiple (`seats`) | Ordered ranking of options | Several seats to fill proportionally |
| Approval | `approval` | One or more (`seats`) | Check any number of options | Simple multi-select, top-N wins |
| Yes/No | (threshold-based) | Per-option pass/fail | Yes or No per option | Motions, propositions, confidence votes |

## Ranked-choice (RCV)

Instant-runoff for a single winner. Voters rank options in order of preference. If no option has a majority of active ballots, the last-place option is eliminated and its ballots transfer to each voter's next choice. This repeats until an option reaches a majority.

- Ballots are stored as an ordered array of `optionId`s.
- A ballot whose ranked options are all eliminated becomes **exhausted** and no longer counts toward the active total.

## Single transferable vote (STV)

Multi-winner proportional representation. A candidate is elected on reaching the **Droop quota**. Surplus votes above the quota transfer fractionally to next preferences, and the lowest candidate is eliminated when no one meets the quota. Fills `seats` winners.

If `seats` is `<= 0` or `>= number of options`, every option is elected (nothing to decide).

## Approval

Voters select any number of options they approve of. Each selection is one vote. The `seats` options with the most approvals win. Ties break toward the smaller `optionId`.

## Yes/No

Each option is voted Yes or No independently. An option **passes** when its share of yes votes (`yes / (yes + no)`) meets the configurable `threshold` percentage (default 50). Useful for motions where each item stands on its own.

## Configuration fields

These live on the `Poll` model (see [Data Model](Data-Model.md)):

- `votingMethod` - `rcv` | `stv` | `approval` (default `rcv`)
- `seats` - number of winners for STV/approval (default 1)
- `threshold` - pass percentage for yes/no (default 50)

## Related

- [Tally Algorithms](Tally-Algorithms.md) - the exact counting logic and edge-case handling
- [Elections](Elections.md) - running several contests with different methods on one ballot
