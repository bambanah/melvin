# Implementation Plans

See `manage-plans` skill for lifecycle conventions. TRDs in [`docs/trd/`](../trd/README.md).

## Active Plans

| Plan | Title                                                    | Priority | Effort | Depends on    | Status |
| ---- | -------------------------------------------------------- | -------- | ------ | ------------- | ------ |
| 007  | One billable-lines interface; the PDF becomes a renderer | P2       | M–L    | 001, 005, 006 | TODO   |
| 016  | Group activities with up to 10 participants              | P2       | L      | 006, 007      | TODO   |

Status: `TODO` | `IN PROGRESS` | `DONE` | `BLOCKED (reason)` | `REJECTED (rationale)`

## Completed

In [`complete/`](complete/): 001, 002, 003, 004, 005, 006, 008, 009, 010, 011, 012, 015. Rejected: 013 (superseded by 005–008).

## Dependency Notes

- **002, 003** — independent, can run in parallel
- **006 → 005** — needs characterization safety net (001, 004, 005 done). Revised 2026-07-07: `f8e5097` already single-sourced the rate (incl. the group 0.43); remaining work is threading `rateContext` + client rates
- **007 → 006** — same files; its `BillableLine[]` interface feeds TRD-002/006. Revised 2026-07-07: the PDF golden-master harness is now its regression net
- **009 → 003** — regression net for ownership rules
- **016 → 006, 007** — apportions all group rates by participant count inside 007's `billableLines` seam; 006's effective transit rate is the base it divides
