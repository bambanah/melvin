# Testing & snapshot guide

## Layers

| Layer                                                 | Command            | Where snapshots live              |
| ----------------------------------------------------- | ------------------ | --------------------------------- |
| Pricing unit tests + PDF text golden masters          | `pnpm test:unit`   | `src/lib/__pdf_text__/*.txt`      |
| PDF visual snapshots (PNG renders of sample invoices) | `pnpm test:unit`   | `src/lib/__pdf_snapshots__/*.png` |
| e2e invoice → PDF flow                                | `pnpm test:e2e`    | —                                 |
| UI visual regression                                  | `pnpm test:visual` | `e2e/visual/__screenshots__/`     |

The `.txt` golden masters are the correctness guarantee: each one is a
human-readable rendering of an invoice's full text (line items, codes, rates,
totals, payment footer) that diffs verbatim in PR review. The committed PNGs
exist so GitHub renders old-vs-new swipe/onion-skin image diffs directly in
PRs.

## Snapshot philosophy: Linux is authoritative

All image baselines (PDF PNGs and UI screenshots) are generated on ubuntu —
CI's platform — never on dev machines.

- **UI screenshots** definitely drift across OSes (browser font rendering),
  which is why `pnpm test:e2e` runs only the `e2e` Playwright project;
  Windows/macOS devs never execute the `visual` project by default. The
  `snapshotPathTemplate` in `playwright.config.ts` drops the platform suffix
  so there is exactly one (Linux) baseline set.
- **PDF PNG renders** are near platform-independent (jsPDF built-in Helvetica
  is substituted with pdfjs's bundled Foxit fonts and rasterized with
  bundled Skia — no OS font stack), and this was verified: Windows-rendered
  output passes comparison against the same baselines inside a Linux
  container. If drift ever appears, gate the render test with
  `test.skipIf(process.platform !== "linux" && !process.env.PDF_SNAPSHOTS)`
  and let CI be the sole enforcer.
- **Text golden masters** are platform-independent and run everywhere; they
  carry the correctness guarantee regardless.

## Updating baselines

**Primary flow:** run the **Update Visual Baselines** workflow
(`workflow_dispatch`) against your PR branch. It regenerates the PDF PNGs and
UI screenshots on ubuntu and pushes a `chore: update visual baselines` commit
to the branch — the PR then shows the old-vs-new image diffs for review.
Review those diffs; that review is the acceptance step.

**Text golden masters** update locally like any Vitest snapshot:
`pnpm vitest run src/lib/pdf-generation.text.test.ts -u`. Review every
changed line — these files encode NDIS pricing.

**PDF PNGs locally (optional):** `pnpm test:pdf-snapshots:update` works on
any OS (renders are platform-stable, see above). To be strict about
generating them on Linux, use docker:

```bash
docker run --rm -v "$PWD":/repo -w /repo -v melvin_nm:/repo/node_modules node:24-bookworm \
  bash -c "corepack enable && pnpm install --frozen-lockfile && UPDATE_PDF_SNAPSHOTS=1 pnpm vitest run src/lib/pdf-generation.render.test.ts"
```

The named volume keeps Linux `node_modules` out of the Windows host tree;
`prisma generate` runs via postinstall and needs no database. On comparison
failure, the actual and diff images land in
`src/lib/__pdf_snapshots__/__diff_output__/` (gitignored).

## pdfjs version pin

`pdfjs-dist` is pinned **exactly** to the version bundled by `react-pdf`
(react-pdf 10.4.1 → pdfjs-dist 5.4.296) so only one copy exists in the tree.
When react-pdf is bumped: re-pin `pdfjs-dist` to the new bundled version and
regenerate all PDF snapshots (text + PNG) — pdfjs updates can shift text
extraction whitespace and rasterization output.

## e2e seed notes

- The seeded `testUser` includes ABN/bank fields; without all five payment
  fields the PDF footer never renders.
- `createRichInvoice()` seeds via direct Prisma writes because the
  invoice-create UI path cannot persist transport items
  (`invoice-schema.ts`'s `activitiesToCreate` omits them).
- Visual specs seed rows prefixed `VIS-` and screenshot
  `/dashboard/invoices?q=VIS-` so parallel e2e specs can't pollute the list.
