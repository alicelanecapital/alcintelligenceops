
## 1. Meetings screen — stronger holiday filter + surface missing Alice Lane meetings

**Investigate first.** Run `supabase--read_query` against `google_calendar_events` for `user_email = 'tendai@alicelanecapital.com'` to see the actual `calendar_id` / `calendar_name` / `organizer_email` / `title` on rows that are leaking into Private Meetings, and to confirm whether known-missing meetings are present in the row set.

Then in `src/routes/interviews.index.tsx`:
- Broaden `dedupeEvents` holiday filter beyond the current keyword check: also drop rows whose `calendar_id` ends in `holiday.calendar.google.com`, whose `calendar_name` contains "holiday", or whose title matches common holiday names (Heritage Day, Freedom Day, Youth Day, Workers' Day, Christmas, Boxing Day, New Year, Good Friday, Family Day, Human Rights Day, Women's Day, Day of Reconciliation).
- Loosen the visibility rule for legitimate meetings: if the query shows real Alice Lane meetings absent from the UI, the `title|start_time` dedupe key is collapsing distinct calendar entries — add `user_email` (or the raw google id) into the key so nothing legitimate gets swallowed.

## 2. Add a booked-events section to Meetings

`src/routes/interviews.index.tsx`
- Add an "Events" column (third block, below Client/Private) sourced from `fetchEvents()` filtered to `booked && !rejected && end_date >= today`. This is where ESG Africa Conference 2026 will surface.
- Reuse the existing calendar-event row styling; click-through jumps to `/events`.

## 3. Swap Bookings Total banner layout

`src/routes/events.tsx` (lines 284–294)
- Swap the two children: descriptive text on the left, the large `{yearTotal}` figure on the right. Keep card chrome unchanged.

## 4. Lighter shading for out-of-month calendar days

`src/routes/calendar.tsx` (line 199)
- Replace `bg-muted/10` for out-of-month days. Because `--muted` is now `#EDEDED`, even at 10 % opacity it composites to the medium grey visible in the screenshot. Use an explicit near-white token (`bg-neutral-50` or a new `--calendar-out-of-month: #FAFAFA`) so those cells are barely tinted.

## 5. Synopsis — DISC / Stakeholder Brief / AI Overview / Red Flags missing (rendering bug, not missing data)

Anastasia Botha's opportunity **does** have DISC and the other intelligence blocks populated in the database — the user has confirmed this. So the fault is in the render path, not in data availability.

- Confirm with `supabase--read_query` on `opportunities` for her id: `select disc_profile, ai_overview, dd_detected_sector, dd_sector_confidence` plus `select stakeholder_brief, red_flags from dd_interviews where opportunity_id = ...`. Log the shapes.
- Read `src/components/SynopsisContent.tsx` end-to-end and compare its selectors (`opp.disc_profile`, `opp.ai_overview`, `interviews[].stakeholder_brief`, `interviews[].red_flags`, `opp.dd_detected_sector`) against the actual JSON shape returned. Very likely candidates for the bug:
  - Field name/casing drift (e.g. `disc` vs `disc_profile`, `overview` vs `ai_overview`).
  - The `.slice(-1)[0]` "last-non-null" pattern for `stakeholder_brief` picking the wrong row because rows are ordered ascending — should pick the most recent non-null.
  - The tabbed anchor-nav header being sticky/opaque and covering the sections underneath so they appear blank on first paint.
- Fix whichever selector is wrong; do NOT gate the sections behind an auto-generation flow (data already exists).
- Verify on `/opportunities/c1f99a00-…/synopsis` that all five sections render with real content.

## Files touched

- `src/routes/interviews.index.tsx`
- `src/routes/events.tsx`
- `src/routes/calendar.tsx`
- `src/components/SynopsisContent.tsx` (+ possibly `opportunities.$id.synopsis.tsx`)

## Verification

- `supabase--read_query` twice: once for the leaking holiday rows, once for Anastasia Botha's opportunity + interviews.
- Manually reload Meetings (no holidays; booked events appear), Events (banner swapped), Calendar (light out-of-month cells), Synopsis (all five sections populated).
