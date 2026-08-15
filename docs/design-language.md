# Design language

Melvin's dashboard has three page grammars: **detail**, **form**, and **list**. Every
dashboard surface uses one of them, or is a documented exception below. When you build a
new page, pick the grammar first - don't invent a fourth.

The grammars describe layout and hierarchy only. Colour, spacing scale and component
styling come from the Tailwind theme tokens in `src/styles/globals.css`; never hardcode a
palette colour (`neutral-900`, `orange-100`) in a component - it will be wrong in dark
mode.

## Detail grammar

One entity, read-first, with its actions in the corner. Reference implementation:
`src/components/activities/activity-page.tsx`.

A detail page reads top to bottom as: **what this is** (header), **what you'd want at a
glance** (facts), **the substance** (sections).

- **Header.** An eyebrow line in the primary colour carrying the entity's date or context,
  then the title, then a muted mono subline for the identifier-ish detail (support item
  code, bill-to). A status badge sits inline with the title, not on its own row.
- **Action cluster.** Right-aligned, sharing the header's top line. At most one primary
  action rendered as a button - the single thing you most likely came to do, which varies
  by state (a draft invoice offers "Mark as Sent", a paid one offers "Amend"). Everything
  else lives in an overflow menu behind an `EllipsisVertical` trigger.
- **Facts.** A `FactGrid` of `Fact` cells (`src/components/shared/fact.tsx`): stacked on
  phones, three columns from `sm` up. Three facts, chosen as the things you would otherwise
  scroll to find. A page with fewer than three at-a-glance facts should omit the grid
  rather than pad it.
- **Sections.** Card-shaped blocks below the header, stacked in a single column.

### Specifics that are easy to get wrong

- The column is `max-w-3xl`, centred. Not `max-w-4xl` - that's the list grammar.
- Bottom padding is `pb-24 md:pb-8`. The wider phone padding clears the floating quick-add
  FAB, which would otherwise sit on top of the last section.
- Edit collapses into the overflow menu on phones: the button is `hidden sm:inline-flex`
  and the menu item is `sm:hidden`. Both exist; neither is visible twice.
- The overflow trigger needs an `aria-label` (`"Invoice actions"`), which is also what the
  e2e specs select on.
- Facts that link elsewhere use the underline-on-hover treatment, not a button.

## Form grammar

Create and edit pages. Deliberately not the detail grammar: a form has no facts to glance
at and no actions to offer beyond submitting.

- A narrow centred column (`max-w-md`), a single page title, then the form.
- No eyebrow, no badge, no action cluster. Submit and cancel live at the bottom of the
  form, where the user's attention already is.
- Section headings within a form use `Heading` (`src/components/ui/heading.tsx`), which
  exists for exactly this job.
- Every form page sets a `<Head>` title, same as detail pages.

## List grammar

Index pages, via `src/components/shared/list-page.tsx`.

- A wider centred column (`max-w-4xl`) than the detail grammar - rows want the room.
- A title row with the create action right-aligned, then filters, then rows.
- Rows are full-width links with hover feedback drawn from theme tokens.

## Exceptions

Two surfaces deliberately sit outside all three grammars. They are not debt.

- **The Log** (`src/pages/dashboard/log.tsx`) is a phone-first capture console whose shape
  came out of the stage-2 prototype verdict in #464. Its density and bottom-anchored
  actions are the point; imposing a desktop detail column would undo that work.
- **The calendar** (`src/pages/dashboard/index.tsx`) is a grid view whose layout is driven
  by the calendar component, not by page chrome.
