# Elections (Multi-Poll Ballots)

Milestone 6 adds **elections**: a single ballot package that contains several contests, each counted with its own voting method. This page covers the design decisions and the secrecy rules that go beyond a single poll. For the tables, see [Data Model](Data-Model.md#election-tables-milestone-6).

## Core idea: reuse `Poll` as the contest

Rather than build a parallel contest type, an `Election` is a container and each contest is a `Poll`:

- `Poll.electionId = null` -> standalone poll.
- `Poll.electionId = <id>` -> a contest within that election.

This reuses every tally engine ([Tally Algorithms](Tally-Algorithms.md)), the options/seats/threshold fields, and most of the admin UI. A presidential RCV contest and a multi-seat STV board election can sit on the same ballot.

## Design decisions

1. **Ballot styles are a fast-follow; columns reserved in v1.**
   v1 assumes every voter sees every contest. `ElectionVoterToken.ballotStyleId` and `ElectionVoterRoll.ballotStyleId` exist but are nullable (`null` = sees all contests), so ballot styles can be introduced later **without** migrating the credential tables.

2. **Blank contests are stored as an explicit empty ballot.**
   Every contest in a voter's ballot style gets a `Ballot` row. A skip is recorded as an explicit "no selection" (empty `rankings` / abstain marker), distinct from a spoiled ballot, so the tally counts **undervotes** correctly. Uniform row counts per contest stop abstention from becoming a side channel that could de-anonymize voters.

3. **One receipt per ballot package.**
   A single random `ElectionReceipt` covers the whole submission. It is **not** linked to the per-contest `Ballot` rows. Because submission is atomic, "package recorded" proves every contest was recorded - without tying the receipt to any individual contest vote.

## Cross-contest secrecy

A naive multi-contest ballot can leak identity by *correlating* a voter's choices across contests. The rules that prevent this:

- **No shared key across a voter's contest ballots.** Each contest's ballots are independently shuffled on display (see [Tally Algorithms](Tally-Algorithms.md#reproducibility-and-display-shuffling)).
- **Timestamps are coarsened or omitted** in the secret ballot set; precise timing is kept only in the election-scoped audit count, not on individual ballots.
- **Small-electorate suppression.** The per-ballot dump is suppressed below a threshold so tiny electorates cannot be re-identified. (Exact threshold TBD.)

## Status and lifecycle

Elections carry their own `status` (`draft` / `open` / `closed`) and optional `startsAt` / `endsAt`, mirroring the poll lifecycle. Election-level events are logged append-only to `ElectionAuditLog`.

## Related

- [Data Model](Data-Model.md) - the `Election*` tables and their relations
- [Security Model](Security-Model.md) - the single-poll secrecy and audit guarantees these rules extend
- [Voting Methods](Voting-Methods.md) - the methods available per contest
