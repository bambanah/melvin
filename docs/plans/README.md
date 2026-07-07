# Implementation Plans

See `manage-plans` skill for lifecycle conventions. TRDs in [`docs/trd/`](../trd/README.md).

## Active Plans

| Plan | Title                                                        | Priority | Effort | Depends on    | Status |
| ---- | ------------------------------------------------------------ | -------- | ------ | ------------- | ------ |
| 004  | Start the weeknight rate at 8pm, not 7pm                     | P1       | S      | —             | TODO   |
| 005  | Characterization tests for trip transit + activity cost math | P1       | S–M    | 004           | TODO   |
| 006  | One source of truth for the Provider Travel per-km rate      | P1       | M      | 001, 005      | TODO   |
| 007  | One billable-lines interface; the PDF becomes a renderer     | P2       | M–L    | 001, 005, 006 | TODO   |
| 008  | Make the Trip transit module the only transit authority      | P2       | M–L    | 005           | TODO   |
| 009  | Router-level test harness (test through the tRPC interface)  | P2       | M      | 003           | TODO   |
| 010  | A tenant-scoping seam under the routers                      | P3       | M      | 003, 009      | TODO   |

Status: `TODO` | `IN PROGRESS` | `DONE` | `BLOCKED (reason)` | `REJECTED (rationale)`

## Completed

In [`complete/`](complete/): 001, 002, 003, 011, 012, 015. Rejected: 013 (superseded by 005–008).

## Dependency Notes

- **002, 003, 004** — independent, can run in parallel
- **005 → 004** — tests lock in corrected 8pm boundary
- **006 → 005** — needs characterization safety net (001 done)
- **007 → 006** — same files; its `BillableLine[]` interface feeds TRD-002/006
- **008 → 005** — foundation for TRD-004
- **009 → 003** — regression net for ownership rules
- **010 → 003, 009** — consolidation under 009's suite
