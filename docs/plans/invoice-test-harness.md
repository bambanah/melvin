# Invoice Test Harness — Implementation Plan

**Status:** Implemented 2026-07-03. All tiers landed and verified (42 unit tests, 13 hand-reviewed text golden masters, 3 PNG baselines, 16/16 e2e). Windows↔Linux PDF raster drift verified to be zero (docker), so no platform skip-gate is armed. Two pre-existing defects were confirmed live and are encoded as `test.fail()` known-defect tests in `e2e/invoice-pdf.test.ts`: **Q4** (pdfjs worker 404 — preview dialog never renders a canvas) and an aggravated **Q3** (streaming endpoint declares Content-Length in UTF-16 code units but writes more utf-8 bytes → HTTP-level malformed response). Remaining manual step: trigger the `update-snapshots` workflow once on ubuntu to mint authoritative UI screenshot baselines (`e2e/visual/__screenshots__` does not exist until then).
**Author:** Architecture review, 2026-07-03
**Constraint:** ⚠️ **No logic changes.** Adding `data-testid` attributes is allowed. The harness must snapshot _current_ behavior — including the known quirks listed below, which get documented in tests, not fixed.

---

## 1. Context & Goal

Melvin generates NDIS tax invoices as PDFs. NDIS payment requirements are strict — one wrong support item code or rate means the provider doesn't get paid. Today the entire invoice line-item/pricing layout lives in `src/lib/pdf-generation.ts` (335 lines: rate selection, provider travel labour/non-labour, activity-based transport, row sorting/merging, grand total, payment footer) and has **zero test coverage**. CI gates nothing about invoice output.

This plan adds a layered harness that:

1. Locks in every pricing branch with unit tests and human-readable golden masters of the PDF text.
2. Produces **visual diffs of sample invoices directly in PRs** (committed PNG renders → GitHub's native swipe/onion-skin image diff).
3. Adds an e2e test of the full invoice → PDF flow.
4. Adds general UI visual regression to CI.

### Key design decisions (with rationale)

| Decision                                   | Choice                                                                    | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTML→PDF refactor                          | **Deferred**                                                              | Feasible (layout isolated in one file; Playwright `page.pdf()` would be the engine) but changes every byte of the artifact NDIS payers currently accept, violates the no-logic-change constraint, and adds a Chromium runtime to the production server (jsPDF is pure JS, Vercel-friendly). The two benefits it buys — testable invoice content and reviewable visual output — are delivered by Tiers 1+2 anyway. The suite built here becomes the safety net _for_ that refactor if it ever happens. |
| PDF golden-master mechanism                | **Extracted text via pdfjs `getTextContent`**, not an autoTable spy       | One mechanism covers everything on the page: header text drawn with `document_.text()`, the table, the Total row, and the payment footer. Text-stream order is deterministic for identical input; jsPDF's nondeterministic `/CreationDate` + `/ID` trailer bytes don't appear in text content. Fallback if a pdfjs bump ever churns whitespace: swap to a `vi.mock("jspdf-autotable")` capture — same fixtures and snapshot layout, so the fallback is cheap.                                         |
| PR visual diffs                            | **Commit PNG baselines to the repo** (3 sample invoices, ~60–200 KB each) | GitHub renders changed PNGs with swipe/onion-skin comparison natively in PR diffs — deliverable achieved with zero external tooling. Regeneration via a manual `workflow_dispatch` job (see Tier 5).                                                                                                                                                                                                                                                                                                  |
| Snapshot authority                         | **Linux (ubuntu CI) is authoritative** for all image baselines            | Dev machine is Windows 11; CI is ubuntu. Browser/UI screenshots definitely drift across OS. PDF rasters _shouldn't_ (see gotcha G6) but a skip-gate is kept ready. Text golden masters run everywhere and carry the correctness guarantee regardless of platform.                                                                                                                                                                                                                                     |
| PDF generation is deterministic in content | Verified                                                                  | No `Date.now()`/`new Date()`/bare `dayjs()` in `pdf-generation.ts`; all dates come from DB fields via `dayjs.utc`. Raw bytes are NOT deterministic (jsPDF `/CreationDate`, `/ID`) — hence text/raster snapshots, never byte snapshots.                                                                                                                                                                                                                                                                |

### Pre-existing quirks — document, do NOT fix

These were found during exploration. Each gets an explanatory comment in the test that encodes it, and should be raised with the repo owner separately:

- **Q1 — PDF line item vs Total rate discrepancy (likely real bug):** `pdf-generation.ts:138` hardcodes non-labour provider travel at `isGroup ? 0.43 : 0.99`/km, but the Total row (`pdf-generation.ts:228`) uses `getTotalCostOfActivities` → `getTransitRate` (client `transitRatePerKm` → 0.99 default). The PDF's own line items can disagree with its printed Total. The `transit-group` fixture (Tier 1b) documents this exactly.
- **Q2 — `rateContext` is dead in production:** no caller of `getTotalCostOfActivities` passes it, so `User.transitRatePerKm` (schema default 0.85) is never applied.
- **Q3 — Lossy PDF stream:** `src/pages/api/invoices/generate-pdf/[id].ts` streaming path does `Buffer.from(pdfString, "base64").toString()` — a lossy utf-8 round trip of binary. e2e asserts status/headers only on that path; content assertions go through `?base64=true`.
- **Q4 — pdfjs worker URL:** `src/components/invoices/pdf-preview.tsx:7` loads the worker from unpkg as `pdf.worker.min.js`, but pdfjs 5.x ships `.mjs`. The preview e2e test may surface a real 404. If it fails, report it as a finding — do not silently patch.
- **Q5 — Transport items not persisted via invoice create:** `src/schema/invoice-schema.ts` `activitiesToCreate` omits `transportItems`, so the invoice-create UI path can't save them. Consequence for tests: seed transport items **directly via Prisma**, never through the UI.
- **Q6 — 404 fall-through:** the `[id].ts` handler's `if (!pdfString)` branch calls `res.status(404).send()` without `return`. Assert on status only.

---

## 2. New devDependencies

| Package           | Version                   | Purpose                                                                                                                                                                                                          |
| ----------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pdfjs-dist`      | `5.4.296` — **pin exact** | Text extraction + rasterization. Must match the version react-pdf 10.4.1 bundles, to avoid duplicate copies. When react-pdf is bumped, re-pin and regenerate snapshots.                                          |
| `@napi-rs/canvas` | `^0.1.100`                | Node canvas backend for pdfjs rendering. Note: it is an _optional dep of pdfjs-dist_ in the `^0.1.x` range (NOT 3.x, and not a jsdom transitive) — make it a direct devDep so helpers can import `createCanvas`. |
| `pixelmatch`      | `^7.1.0`                  | PNG diffing (ESM, fine under Vitest 4).                                                                                                                                                                          |
| `pngjs`           | `^7.0.0`                  | PNG decode/encode for pixelmatch.                                                                                                                                                                                |

No puppeteer, no jest-image-snapshot, no testing-library.

---

## 3. Tier 1 — Pricing unit gaps + PDF text golden masters (Vitest)

### 3a. Fill pure-function gaps (extend existing test files, follow their existing helper style)

**`src/lib/activity-utils.test.ts`** — currently covers `getRateForActivity` day/time branches and basic totals. Add:

- `getTotalCostOfActivities` with `transportItems`: DISTANCE solo (×0.99), DISTANCE group (×0.49), PARKING/TOLL/OTHER flat amounts, mixed list, `Prisma.Decimal` amounts.
- KM `rateType` branch: activity with `itemDistance` and no start/end times → `itemDistance × rate` (`activity-utils.ts:148–150`, never exercised today).
- `getTransitRate` precedence (not exported — test through `getTotalCostOfActivities` with `transitDistance` set): (1) `activity.client.transitRatePerKm` wins; (2) falls back to `rateContext.userTransitRatePerKm`; (3) falls back to `0.99`. Also `Decimal(0)` client rate falls through due to `Number(x) || y` — snapshot current behavior.

**`src/lib/support-item-utils.test.ts`** — add `getActivityBasedTransportCode`: group 125 (`04_104_0125_6_1` → `04_590_0125_6_1`, verified present in `ndis-support-catalogue-22-23.json`), 9-digit middle block, `_T` suffix, unknown group → `undefined`, malformed code → `undefined`. Mirror the same matrix for `getNonLabourTravelCode` (`→ 04_799_0125_6_1`).

**`src/lib/invoice-utils.test.ts`** — add `invoiceCandidatesFromPaymentAmount` (backtracking subset-sum, float-sensitive): single exact match, multi-invoice combination, multiple valid combinations, float rounding (e.g. 3.30 + 6.80 = 10.10), no match → `[]`, empty map, amount 0.

### 3b. Fixture module — create `src/lib/testing/invoice-fixtures.ts`

Hand-authored (no faker), typed to the **exact shapes of the two Prisma queries** in `generatePDF`:

1. `prisma.invoice.findUnique({where}).client({select:{id}})` — fluent call, see gotcha G1.
2. `prisma.invoice.findFirst({include: {client, activities: {include: {supportItem: {include: {supportItemRates}}, transportItems}}}})`
3. `prisma.user.findUnique` → `User` row (`abn: BigInt`, `bsb`, `bankNumber: BigInt`, `bankName` — footer only renders when all 5 fields present, `pdf-generation.ts:265`).

Use real 0125-family support item codes so catalogue lookups resolve. Export `mockPrismaForFixture(fixture)` returning the mock module shape.

**Fixture scenarios (each = one invoice):**

| #   | Name                       | Exercises                                                                                                                                                                                                  |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ----------------- |
| 1   | `basic-weekday`            | One HOUR activity, weekday daytime, base rates, full payment footer                                                                                                                                        |
| 2   | `weeknight`                | endTime ≥ 19:00 → weeknight code/rate                                                                                                                                                                      |
| 3   | `saturday`                 | Saturday date → saturday code/rate                                                                                                                                                                         |
| 4   | `sunday`                   | Sunday date → sunday code/rate                                                                                                                                                                             |
| 5   | `client-custom-rates`      | `supportItemRates` overrides weekday+saturday; weeknight absent → falls back to base (per-day `customRate                                                                                                  |     | base` precedence) |
| 6   | `km-rate-type`             | `rateType: KM`, `itemDistance: 34` → `"34 km"` / `$rate/km` branch                                                                                                                                         |
| 7   | `transit-solo`             | `transitDuration: 30` + `transitDistance: 15`, solo → Labour row (rate/60) + Non-Labour row (0.99, code `04_799_0125_6_1`)                                                                                 |
| 8   | `transit-group`            | Same but `isGroup: true` → 0.43 row vs 0.99 inside Total — **documents Q1**                                                                                                                                |
| 9   | `transport-all-types`      | 4 transportItems: DISTANCE 22 km solo (×0.99, code `04_590_0125_6_1`), PARKING 8.50 with note, TOLL 5.70, OTHER 12.00 with `note: null` (the `"-\n"` fallback)                                             |
| 10  | `transport-group-distance` | `isGroup: true` DISTANCE → ×0.49                                                                                                                                                                           |
| 11  | `duplicate-merge`          | Two activities, same supportItem/description, different dates → merged single row with concatenated date/count/price/total cells (`pdf-generation.ts:207–223`)                                             |
| 12  | `kitchen-sink`             | 6+ activities across all day types + custom sat rate + transit + transport + duplicate pair; `client.number` and `billTo` set (exercises `startY` offset at line 284). **Primary PR-diff sample invoice.** |
| 13  | `no-payment-footer`        | User missing `bankName` → footer block omitted (`content.length !== 5`)                                                                                                                                    |

### 3c. Golden-master tests

**Create `src/lib/testing/pdf-test-utils.ts`:**

- `extractPdfText(base64: string): Promise<string>` — import `pdfjs-dist/legacy/build/pdf.mjs`; `getDocument({ data, useSystemFonts: false, standardFontDataUrl: <node_modules/pdfjs-dist/standard_fonts/> })`; per page `getTextContent()`; group items into lines keyed by `(page, round(transform[5]))`, sort y-desc then x-asc, join columns with `" | "`. Node uses pdfjs's built-in fake worker automatically — no worker file setup needed.
- `renderPdfPageToPng(base64: string, pageNo: number, scale = 2): Promise<Buffer>` — pdfjs render into `@napi-rs/canvas` `createCanvas`, `canvas.encode("png")` (used by Tier 2).

**Create `src/lib/pdf-generation.text.test.ts`:**

- **Line 1 must be `// @vitest-environment node`** — the project default is jsdom, which breaks pdfjs in Node (gotcha G2).
- Per fixture: `vi.mock("@/server/prisma", ...)` → `await generatePDF(id)` → `expect(await extractPdfText(pdfString)).toMatchFileSnapshot(\`**pdf_text**/${name}.txt\`)`.
- File snapshots (Vitest 4 `toMatchFileSnapshot`), committed under `src/lib/__pdf_text__/` — each fixture becomes a human-readable `.txt` invoice whose line-item diffs render verbatim in PR review.
- Add targeted `expect(text).toContain(...)` assertions per fixture for the support item codes and the grand total, so a failure names the broken invariant rather than just "snapshot changed".

---

## 4. Tier 2 — PDF visual snapshots (committed PNGs → GitHub PR image diff)

**Create `src/lib/pdf-generation.render.test.ts`** (`// @vitest-environment node`).

- Baselines at `src/lib/__pdf_snapshots__/<fixture>.page1.png` for **3 fixtures only** (`basic-weekday`, `transport-all-types`, `kitchen-sink`) at scale 2 (~1190×1684 px) — keeps repo growth bounded.
- Comparison helper in `pdf-test-utils.ts`: `comparePng(actual, baselinePath, { threshold: 0.1, maxDiffPixelRatio: 0.002 })` via pixelmatch. On failure: write `actual` + `diff` PNGs to `src/lib/__pdf_snapshots__/__diff_output__/` (**gitignore this dir**) and fail with the diff path in the message.
- `UPDATE_PDF_SNAPSHOTS=1` env → helper writes the baseline instead of comparing.
- **Drift hypothesis (test during implementation):** the PDF uses jsPDF built-in Helvetica (the Inter font import at `pdf-generation.ts:19` is commented out), so pdfjs substitutes its _bundled_ Foxit standard fonts and rasterizes with its _bundled_ Skia via `@napi-rs/canvas` — no OS font stack involved; Windows↔Linux drift should be near zero. Don't bet the suite on it: keep `test.skipIf(process.platform !== "linux" && !process.env.PDF_SNAPSHOTS)` ready as an escape hatch if drift exceeds tolerance. Tier 1 text masters carry correctness on all platforms regardless.
- Baseline acceptance flow: primary = the `update-snapshots` workflow (Tier 5) which regenerates on ubuntu and commits to the PR branch, so the reviewer sees old-vs-new swipe diffs in the PR itself. Local docker fallback (document in `e2e/README.md`):

  ```
  docker run --rm -v "$PWD":/repo -w /repo -v melvin_nm:/repo/node_modules node:24-bookworm \
    bash -c "corepack enable && pnpm install --frozen-lockfile && UPDATE_PDF_SNAPSHOTS=1 pnpm vitest run src/lib/pdf-generation.render.test.ts"
  ```

  (Named volume shields Linux `node_modules` from the Windows host tree; `prisma generate` runs via postinstall, needs no DB.)

---

## 5. Tier 3 — e2e invoice → PDF flow (Playwright)

### testid additions (verified against current component code — the only allowed source changes)

| File / location                                                                                                               | Add                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/components/invoices/invoice-page.tsx:101` — the preview overlay div with `onClick={() => setIsPdfPreviewExpanded(true)}` | `data-testid="pdf-preview-trigger"` (bare div, nested "Preview" text — testid is the robust locator) |
| `src/components/invoices/invoice-page.tsx:129` — the total `<p className="text-xl">`                                          | `data-testid="invoice-total"`                                                                        |
| `src/components/invoices/pdf-preview.tsx:53` — container div                                                                  | `data-testid="pdf-preview"` (assert a `canvas` renders inside it)                                    |
| Download link (`invoice-page.tsx:181`)                                                                                        | **none needed** — `getByRole("link", { name: "Download PDF" })`                                      |

### Seed helpers — modify `e2e/test-utils.ts`

- Add `abn`, `bankName`, `bsb`, `bankNumber` to the seeded `testUser` (all optional fields; currently absent, so the payment footer silently never renders in e2e). No existing spec asserts on the user, so this is additive-safe.
- Add `createRichInvoice()` — **direct Prisma writes** (bypasses the invoice-create UI because of Q5): fixed-string client (with `number`, `billTo`, one `supportItemRates` override), an HOUR support item with all 4 day codes (0125 family) plus a KM item, invoice with fixed `invoiceNo` (e.g. `PDF-1`), activities covering weekday + saturday with transit fields, and `activityTransportItem` rows (DISTANCE + PARKING). Return the ids plus the expected total computed with `getTotalCostOfActivities` (path aliases already resolve in Playwright — `test-utils.ts` imports `@/server/prisma` today).

### Spec — create `e2e/invoice-pdf.test.ts`

1. Seed via `createRichInvoice()`; `goto /dashboard/invoices/<id>`.
2. Assert `getByTestId("invoice-total")` shows the expected AUD-formatted total.
3. Click `pdf-preview-trigger`; expect a `canvas` visible inside `getByTestId("pdf-preview")`. _(This is the test that may surface Q4 — if it 404s on the worker, report the finding; don't patch.)_
4. `page.request.get('/api/invoices/generate-pdf/<id>?base64=true')` → 200 + `application/pdf`; decode base64; `extractPdfText` (reuse `src/lib/testing/pdf-test-utils.ts`) → assert invoice number, participant name, support item codes (main + `04_799_…` + `04_590_…`), and `Total $<expected>`.
5. Plain `GET /api/invoices/generate-pdf/<id>` → 200 + `application/pdf` + `content-disposition` filename **only** (Q3 — do not assert body).
6. Unknown id → assert 404 status only (Q6).

---

## 6. Tier 4 — UI visual regression (Playwright `toHaveScreenshot`)

### Config — modify `playwright.config.ts`

```ts
projects: [
  { name: "e2e", testIgnore: /visual/ },
  { name: "visual", testMatch: /visual\/.*\.test\.ts/,
    use: { viewport: { width: 1280, height: 800 }, colorScheme: "light" } },
],
snapshotPathTemplate: "{testDir}/visual/__screenshots__/{testFileName}/{arg}{ext}", // drops platform suffix → single Linux baseline set
expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled", caret: "hide" } },
reporter: [["list"], ["html", { open: "never" }]],
use: { /* existing */ trace: "retain-on-failure" },
```

**Linux-only policy (non-negotiable for browser screenshots):** baselines are generated only on ubuntu (CI or the update job). `pnpm test:e2e` becomes `playwright test --project=e2e`, so Windows devs never run the visual project by default — this also prevents Playwright from auto-creating wrong baselines on a missing-snapshot run.

### Spec — create `e2e/visual/visual.test.ts`

Fixed literals everywhere — no faker (if a shared helper pulls faker in, `faker.seed(42)` in `beforeAll`, but prefer literals):

- **Invoice list** seeded with 3 invoices prefixed `VIS-`, fixed dates/statuses, screenshot `/dashboard/invoices?q=VIS-` — the `q=` search param (verified to persist in URL) isolates the list from rows created by parallel e2e specs.
- **Invoice detail page** for a seeded `VIS-` invoice (fixed `date`, no `sentAt` → no dynamic text).
- **Create-invoice form** (empty state).
- **PDF preview dialog** open (pdfjs canvas render is deterministic on Linux chromium; `fullPage: false`).

Mask nothing if seeds are fully fixed; otherwise `mask:` the date cells.

---

## 7. Tier 5 — CI wiring

### Modify `.github/workflows/lint-and-test.yml`

- **e2e-tests job:** run `pnpm exec playwright test --project=e2e`; add:
  ```yaml
  - uses: actions/upload-artifact@v6
    if: failure()
    with:
      name: playwright-report
      path: |
        playwright-report/
        test-results/
      retention-days: 7
  ```
- **New `visual-tests` job** (parallel, clone of e2e-tests): postgres service container, `playwright install chromium --with-deps`, `pnpm prisma:push`, `pnpm test:visual`; upload `test-results/` (contains `-actual`/`-diff` images) on failure. Separate job keeps failure signal clean.
- **unit-tests job:** unchanged command — Tier 1 text masters and Tier 2 PNG comparisons run inside `pnpm test:unit` on ubuntu (Prisma mocked, no DB; `postinstall` already runs `prisma generate`).

### Create `.github/workflows/update-snapshots.yml`

`workflow_dispatch` with a branch input (skip label-triggering — plumbing + fork-permission edge cases aren't worth it for a single-maintainer repo):

- checkout `ref: ${{ inputs.branch }}`, `permissions: contents: write`, pnpm install, postgres service.
- `UPDATE_PDF_SNAPSHOTS=1 pnpm vitest run src/lib/pdf-generation.render.test.ts`
- `pnpm exec playwright install chromium --with-deps && pnpm prisma:push && pnpm exec playwright test --project=visual --update-snapshots`
- `git add` the snapshot dirs (`**/__pdf_snapshots__/**`, `e2e/visual/__screenshots__`, `src/lib/__pdf_text__`), commit `chore: update visual baselines`, push (skip if clean).

**This job IS the baseline-acceptance workflow:** the PR then shows old-vs-new image diffs for reviewer sign-off.

### package.json script changes

```json
"test:e2e": "playwright test --project=e2e",
"test:visual": "playwright test --project=visual",
"test:pdf-snapshots:update": "cross-env UPDATE_PDF_SNAPSHOTS=1 vitest run src/lib/pdf-generation.render.test.ts"
```

### Create `e2e/README.md`

Snapshot philosophy (Linux-authoritative), when/how to update baselines (CI job primary, docker fallback), the pdfjs version-pin coupling with react-pdf.

---

## 8. Gotchas for the implementer

- **G1 — Fluent Prisma mock:** the first query in `generatePDF` is `prisma.invoice.findUnique({...}).client({ select })`. The `findUnique` mock must return an object bearing an async `.client()` method — not a plain promise. `findFirst` resolves the full invoice; `user.findUnique` resolves the user.
- **G2 — Vitest environment:** project default is jsdom (`vitest.config.mts`); every PDF test file needs `// @vitest-environment node` as its first line, and pdfjs must be imported from `pdfjs-dist/legacy/build/pdf.mjs`. The Node "fake worker" warning is benign.
- **G3 — Never byte-snapshot the PDF:** jsPDF stamps `/CreationDate` and a trailer `/ID` per run.
- **G4 — pdfjs version coupling:** pin `pdfjs-dist@5.4.296` exactly (react-pdf 10.4.1's bundled version). A react-pdf bump requires re-pin + snapshot regeneration.
- **G5 — Manual review is the audit:** when the `.txt` golden masters are first generated, review every line item against expected NDIS pricing _by hand_ before committing. That review — not the snapshot mechanism — is the actual correctness verification; budget time for it.
- **G6 — Raster drift:** try cross-platform first (bundled fonts + bundled Skia should make it near-zero); if Windows↔Linux drift exceeds `maxDiffPixelRatio: 0.002`, enable the platform skip-gate and let CI be the sole enforcer.
- **G7 — e2e may surface real defects** (Q4 worker 404, Q3 lossy stream): fail honestly and report; do not hack around them or patch product code.
- **G8 — Shared `testUser` mutation** (new bank fields in `e2e/test-utils.ts`) is additive and optional-field-only; no existing spec asserts on it.

---

## 9. Ordering of work

1. **Unit gaps** (§3a) — zero new deps, immediate value.
2. **Fixtures + Prisma mock + text golden masters** (§3b/3c) — add `pdfjs-dist`; hand-review all `.txt` output (G5) before committing.
3. **Tier 2 renders** (§4) — add `@napi-rs/canvas`, `pixelmatch`, `pngjs`; test the drift hypothesis locally on Windows.
4. **testids + Tier 3 e2e spec** (§5) — independent of 2–3 except reusing `extractPdfText`.
5. **Tier 4 visual project** (§6) — config split first so `test:e2e` stays green, then the spec.
6. **Tier 5 CI + update-snapshots workflow + README** (§7); trigger the update job once to mint the authoritative Linux baselines.

## 10. Verification

```bash
pnpm test:unit                                    # Tiers 1+2 (Windows: pixel tests may skip per gate)
pnpm type-check && pnpm lint && pnpm format:check
pnpm db:up && pnpm prisma:push && pnpm test:e2e   # Tier 3 incl. new invoice-pdf spec
pnpm test:visual                                  # meaningful on Linux/CI once baselines exist
```

End-to-end proof of the PR-diff deliverable: open a PR that deliberately changes a rate in one fixture → confirm the `.txt` diff and the PNG swipe-diff both render in the GitHub PR view; run the `update-snapshots` workflow against that branch → confirm the baseline commit appears on it.

## 11. Reference — key existing files

| File                                                                                  | Role                                                                        |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/lib/pdf-generation.ts`                                                           | The system under test — all invoice layout/pricing rows                     |
| `src/lib/activity-utils.ts`                                                           | `getRateForActivity`, `getTotalCostOfActivities`, `getTransitRate`          |
| `src/lib/support-item-utils.ts`                                                       | travel/transport code lookup against the NDIS catalogue JSON                |
| `src/lib/invoice-utils.ts`                                                            | invoice numbering + `invoiceCandidatesFromPaymentAmount`                    |
| `src/server/api/routers/pdf-router.ts`, `src/pages/api/invoices/generate-pdf/[id].ts` | the two PDF consumers                                                       |
| `e2e/test-utils.ts`, `e2e/setup/global.setup.ts`                                      | seeded test user + session-cookie auth bypass, Prisma seed helpers          |
| `playwright.config.ts`, `vitest.config.mts`                                           | test runner configs to modify                                               |
| `.github/workflows/lint-and-test.yml`                                                 | the only CI workflow today (3 parallel jobs; no artifacts, no visual gates) |
