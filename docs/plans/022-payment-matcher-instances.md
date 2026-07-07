# Plan 022: Match payments against invoice instances, not deduplicated totals

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4b83de4..HEAD -- src/lib/invoice-utils.ts src/lib/invoice-utils.test.ts src/server/api/routers/invoice-router.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (read-only suggestion path; no persisted state)
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `4b83de4`, 2026-07-07

## Why this matters

The payment-matching suggestion ("which sent invoices does this bank deposit cover?") runs a subset-sum over the **distinct** invoice totals, not the invoices. Two consequences whenever totals collide (which is common — same client, same weekly schedule → identical totals): (1) a $200 payment can never be matched to two $100 invoices, because $100 appears once in the candidate set; (2) when one $100 invoice matches, the result includes _every_ invoice with a $100 total, so the UI surfaces wrong candidates. TRD-005 explicitly leaves payment matching to this fix ("payment matching bugs are finding #9; not this TRD").

## Current state

- `src/lib/invoice-utils.ts:91-131` — the pure algorithm:

```ts
export function invoiceCandidatesFromPaymentAmount(
	paymentAmount: number,
	invoiceTotals: Map<number, string | string[]>
): (string | string[])[][] {
	const totalAmounts = [...invoiceTotals.keys()].sort((a, b) => a - b);
	// backtracking subset-sum over totalAmounts (each DISTINCT amount usable once),
	// then maps each chosen amount back to invoiceTotals.get(amount) — i.e. ALL
	// ids sharing that amount are returned as one entry.
}
```

- `src/server/api/routers/invoice-router.ts:722-758` — the caller (`matchByPayment` procedure area) builds the collapsing map:

```ts
// Convert array of invoices to map of <total, invoiceId>
const totals = new Map<number, string | string[]>();
for (const invoice of invoices) {
	const total = Number(invoice.versions[0]?.total ?? 0);
	if (totals.has(total)) { /* push id into array */ } else { totals.set(total, invoice.id); }
}
const invoiceIds = invoiceCandidatesFromPaymentAmount(paymentAmount, totals);
const invoiceDetails = invoices
	.filter((invoice) => invoiceIds.flat(2).includes(invoice.id))
	.map(...);
return { invoiceIds, invoiceDetails };
```

- Money comparison uses `round(x, 2)` from `src/lib/generic-utils.ts` inside the backtracking (`round(currentSum + amount, 2)`) — keep cent-rounded addition in the rewrite.
- Unit test pattern: `src/lib/invoice-utils.test.ts` exists — follow its style.
- Find the UI consumer before changing the return shape: `grep -rn "matchByPayment\|invoiceIds" src/components/` — update its typing/rendering to the new shape in the same change.

## Commands you will need

| Purpose     | Command                                              | Expected on success |
| ----------- | ---------------------------------------------------- | ------------------- |
| Typecheck   | `pnpm type-check`                                    | exit 0              |
| Unit tests  | `pnpm exec vitest run src/lib/invoice-utils.test.ts` | all pass            |
| All unit    | `pnpm test:unit`                                     | all pass            |
| Integration | `pnpm db:up && pnpm test:integration`                | all pass            |
| Lint        | `pnpm lint`                                          | exit 0              |

## Scope

**In scope**:

- `src/lib/invoice-utils.ts`
- `src/lib/invoice-utils.test.ts`
- `src/server/api/routers/invoice-router.ts` (the `matchByPayment` caller only)
- The single UI component consuming `matchByPayment`'s result (locate via grep; likely under `src/components/invoices/`)

**Out of scope**:

- Persisting payments/reconciliation state — suggestions stay a read-only query.
- Any other invoice-router procedure.

## Git workflow

- Branch: `advisor/022-payment-matcher-instances`
- Commit: `fix: match payments against invoice instances instead of deduped totals`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Rewrite the pure function over instances

Replace `invoiceCandidatesFromPaymentAmount` with an instance-based signature:

```ts
export function invoiceCandidatesFromPaymentAmount(
	paymentAmount: number,
	invoices: { id: string; total: number }[]
): string[][]; // each inner array = one candidate combination of invoice ids
```

Backtracking over the array (each _invoice_ usable at most once; two $100 invoices are two elements). Keep `round(sum, 2)` cent arithmetic. Sort by total ascending for pruning (`currentSum > paymentAmount` cutoff), as today. De-duplicate _equivalent_ combinations (same multiset of totals) only if the existing UI shows an unmanageable number — otherwise return all id combinations and let the UI render invoice numbers (two $100 invoices genuinely are two different suggestions).

**Verify**: `pnpm exec vitest run src/lib/invoice-utils.test.ts` → existing tests updated to the new shape, all pass.

### Step 2: Simplify the router caller

In `matchByPayment`, delete the `Map<number, string | string[]>` construction; pass `invoices.map(i => ({ id: i.id, total: Number(i.versions[0]?.total ?? 0) }))` directly. `invoiceDetails` filtering becomes `invoiceIds.flat().includes(invoice.id)`.

Also handle the `?? 0` case deliberately: invoices with **no version** currently enter the map with total 0 and can pad combinations. Filter out zero-total invoices before matching (a version-less SENT invoice shouldn't be suggested against a real payment).

**Verify**: `pnpm type-check` → exit 0; `pnpm test:integration` → all pass.

### Step 3: Update the UI consumer

Adjust the component's types/rendering to `string[][]`. Behavior: each combination renders as one suggestion row listing its invoices.

**Verify**: `pnpm type-check` → exit 0; `pnpm lint` → exit 0.

## Test plan

In `src/lib/invoice-utils.test.ts` (follow existing style), cover:

1. Regression: two invoices both $100, payment $200 → exactly one candidate combination containing both ids.
2. Regression: two invoices both $100, payment $100 → two candidate combinations (one per invoice), not one combination containing both.
3. Existing behavior preserved: distinct totals summing to the payment (e.g. $60 + $40 → $100) → matched.
4. No match → empty array.
5. Cent-rounding: $33.33 + $66.67 → $100.00 matches (float noise guarded by `round`).
6. Zero-total invoices are never part of any combination (if you implement the filter in the lib rather than the router, test here; otherwise add an integration assertion).

Verification: `pnpm test:unit` → all pass including the 6 new cases.

## Done criteria

- [ ] `pnpm type-check` exits 0
- [ ] `pnpm test:unit` exits 0, including the new matcher tests
- [ ] `pnpm test:integration` exits 0
- [ ] `grep -n "Map<number" src/server/api/routers/invoice-router.ts` returns no matches in `matchByPayment`
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- Combination counts explode for realistic inputs (many same-total invoices make subset-sum combinatorial). If a user with ~20 outstanding same-total invoices makes the endpoint slow, cap the search (e.g. max combination size or max results) and report the cap you chose.
- The UI consumer turns out to depend on the nested `(string | string[])[][]` shape in a way that isn't a mechanical update.
- The excerpts don't match the live code.

## Maintenance notes

- TRD-005 (plan 034) adds send/cadence flows that increase the number of SENT invoices at once; if matching gets slow, memoize per (paymentAmount, invoice set) or move the cap server-side.
- Reviewers: check the zero-total filter — it encodes the judgment that version-less invoices are not payment candidates.
