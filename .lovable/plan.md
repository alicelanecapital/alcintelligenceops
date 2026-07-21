## Goal

Make the "Deal" workspace (the DD Interview screen opened from Deal Pipeline) mirror the visual pattern of the DD Intelligence Engine admin: an accordion for the 5 in-round steps, a cleaner horizontal round stepper, and no shaded frames anywhere inside the steps. Plus two small Deal Pipeline fixes.

## Scope

Files touched:
- `src/components/DDInterviewEnhanced.tsx` — main restructure
- `src/components/RoundStepper.tsx` — horizontal variant restyle
- `src/routes/dd-interview.$opportunityId.$round.tsx` — layout wrapper cleanup
- `src/routes/dd-engine.tsx` — Resume triangle colour + View Synopsis behaviour
- `src/routes/opportunities_.$id.synopsis.tsx` — verify/fix synopsis page load

No data/schema/server-fn changes.

## 1. Horizontal round stepper

Current: five wide "card" buttons each with their own border, rounded background, coloured fill when active/completed — reads as five framed tiles.

New: match the admin accordion header aesthetic — a flat horizontal row of numbered pills, no card frames.

- Remove per-item `border`, `rounded-lg`, `bg-card`, `bg-primary/10`, `bg-emerald-600` background classes.
- Each round shows: numbered circle badge (same styling as admin `SortableRoundItem` — `h-6 w-6 rounded-full bg-primary text-primary-foreground` for active, muted outline for inactive, filled emerald with check for completed) + bold forest-green title.
- Items separated by a thin `border-t border-border` rail; the active item gets a hairline underline only.
- Hover underlines the title; no background change.
- Vertical stepper variant unchanged.

## 2. In-round steps → accordion

Today `DDInterviewEnhanced` renders 5 steps (`documents`, `questions`, `software`, `verification`, `ai_analysis`) via an `activeStep` tab strip inside bordered/shaded cards.

Change to the admin `admin.dd-framework.tsx` pattern:

- Replace the `activeStep` tab strip with a single `<Accordion type="multiple">`, default-open on the current step.
- Five `<AccordionItem>`s in order: Required Documents, Questions, Sector Software Modules, Verification Triangle, AI Analysis & Human Assessment.
- Header shape mirrors admin: chevron → forest-green numbered badge → bold forest-green step title → optional subtitle. `border-b border-border` between items, no outer card frame.
- Remove `activeStep` state and the tab-switch buttons. Bodies keep all existing logic (recording, uploads, AI generation, gate actions).

## 3. Remove shading & frames inside every step

Sweep step bodies in `DDInterviewEnhanced.tsx`:

- Drop `bg-muted`, `bg-card`, `bg-*-50/100` container backgrounds on section wrappers.
- Drop `border rounded-lg p-4` container styling; use `space-y-4` blocks with hairline `border-b border-border` dividers between sub-sections.
- Preserve intentional accent shading:
  - Transcript block stays grey
  - AI Questions stay pastel teal
  - Custom Questions stay pastel orange
  - Stakeholder Brief stays pastel baby blue
  - Red Flags panel keeps its severity colouring
- Everything else (Required Documents list, Verification Triangle, Software Modules, AI Analysis body, Human Assessment textarea wrapper, gate action panel) becomes frame-free and background-free.

## 4. Deal Pipeline row buttons (`dd-engine.tsx`)

- **Resume/Begin triangle colour**: change the `<Play>` icon from `text-green-500 fill-green-500` to forest green (`text-green-800 fill-green-800`, matching the round-title forest green used elsewhere).
- **View Synopsis fix**: today the button calls `navigate({ to: "/opportunities/${oppId}/synopsis" })` but the route file declares `createFileRoute("/opportunities_/$id/synopsis")`. The generated path is `/opportunities/$id/synopsis` (underscore = flat-route escape), so the URL matches, but this discrepancy is fragile and the user reports the button doesn't open the synopsis PDF. Fix by:
  1. Verifying `routeTree.gen.ts` resolves the flat route to `/opportunities/$id/synopsis`; if the generated path differs, correct the `navigate` target in `dd-engine.tsx` to the actual path.
  2. If the synopsis page loads but rendering is empty/broken (which would look like "nothing opens"), fix the render path in `SynopsisContent` / `opportunities_.$id.synopsis.tsx`.
  3. If the page is fine and the user's real intent is "the button should download the PDF directly, not open a page", switch the button to trigger `html2canvas + jspdf` inline (extracting the existing `handleDownloadPdf` into a shared helper) so clicking "View Synopsis" produces the PDF without a route hop. Confirm with user which behaviour is preferred if the page loads correctly — otherwise fix the load.

## 5. Route wrapper

`dd-interview.$opportunityId.$round.tsx`: keep "Back to Opportunities" and the horizontal `RoundStepper`, tighten `mb-6` spacing if the new flat stepper looks loose. No functional changes.

## Out of scope

- Deal Pipeline list layout, synopsis dialog component, admin DD Framework screen, data model, RLS, server functions.

## Verification

- Open a Deal from Pipeline: stepper is a flat numbered row, no card frames.
- Round page shows five collapsible sections styled like admin; current step opens by default; content frame-free except the four accented panels.
- Advance round, upload docs, record transcript, run AI analysis all still work.
- Resume button triangle renders forest green.
- View Synopsis produces the intelligence output (page or PDF, per resolution above).
