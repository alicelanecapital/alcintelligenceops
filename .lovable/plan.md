## Current Events — expanded discovery + card redesign

Two coordinated changes to `/events`: broaden what the AI pulls in, and redesign each event card with reject / AI intel / book-with-attendees, plus running cost totals.

### 1. Expand AI discovery (`src/lib/event-discovery.functions.ts`)

Rewrite the prompt so SA and Global lists include high-prestige events **hosted or headlined by top-tier institutions**, not only sector conferences:

- **Investment banks & houses**: RMB, Investec, Standard Bank CIB, Absa CIB, Nedbank CIB, JPMorgan, Goldman Sachs, Morgan Stanley, Rothschild, Lazard, Citi, HSBC, BofA, Barclays, UBS, Deutsche Bank.
- **Global tech & platform companies**: Microsoft (Ignite/Build), Google (Cloud Next, I/O), Meta (Connect), AWS (re:Invent), NVIDIA (GTC), Apple, OpenAI, Salesforce, Oracle, IBM.
- **Prestige forums**: WEF Davos, Milken, Bloomberg, FT Live, Economist Impact, Concordia, Aspen Ideas.
- **DFI & PE bodies**: IFC, AfDB, SAVCA, AVCA, EMPEA, BVCA.

Keep the same quality bar (senior decision-makers, deal-making potential), the "starts after today, next 9 months" rule, JSON response shape, and region re-derivation. Bump each list from 12 → 15.

### 2. Redesign event card (`src/routes/events.tsx`)

**Buttons on each event card**:
- Remove **Delete** (trash icon).
- Add **Reject** — hides the event from Current Events for this user/team. Reuses `deleteEvent(id)` under a "Reject" label (destructive but soft in copy: "Reject event? It will be removed from your list.")
- Keep **Edit**, keep **Capture contact**.
- Add **AI Intelligence** (Sparkles icon, icon-only, tooltip "AI intel"). Opens a modal that calls a new `generateEventIntel` server fn (Lovable AI Gateway, `google/gemini-2.5-flash`) and returns: overview, who typically attends, agenda themes, notable past speakers, deal-flow potential, and 3 conversation starters. Streamed into a scrollable dialog. Results cached in local component state per event id for the session.
- Replace the current **Book** toggle with a two-step flow:
  1. Click **Book** → inline popover asks *"How many people attending?"* (numeric input, default 1).
  2. On confirm, opens `event.website` in a new tab AND marks the event booked with `attendees_count` stored, `booked_by = user.email`, `booked_at = now()`. Also stores `total_cost = cost * attendees_count`.

**Totals**:
- Under each card's buttons: **"Your booking: R{cost × qty}"** (only shown when booked).
- On each month accordion header: **"Month total: R{sum of booked totals in month}"** on the right.
- At the top of the page (above the filter row): **"{Year} bookings total: R{sum of all booked events' totals for the current year}"** as a prominent stat card.

### 3. Schema (`events` table — one migration)

Add three columns; safe to add nullable with defaults so existing rows are unaffected:

```sql
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS attendees_count integer,
  ADD COLUMN IF NOT EXISTS total_cost numeric,
  ADD COLUMN IF NOT EXISTS rejected boolean NOT NULL DEFAULT false;
```

Filter `rejected = false` in the events query so rejected rows disappear from the UI but stay in the DB (undo later if needed). No new RLS — existing policies cover new columns.

### 4. Files touched

- `src/lib/event-discovery.functions.ts` — new prompt + count.
- `src/lib/founders-data.ts` — extend `updateEvent` payload typing (already `any`, no change needed) and add `rejectEvent(id)` alias if we want the semantics clear.
- `src/lib/event-intel.functions.ts` — **new**: `generateEventIntel({ event })` server fn.
- `src/routes/events.tsx` — card redesign, month/year totals, booking-qty popover, AI intel modal, replace delete with reject, filter out rejected.
- Migration for the three new columns.

### Out of scope

- No changes to Contacts capture flow, calendar auto-match, or the discovery auto-run behaviour.
- No payment processing — Book still just opens the event's `website` URL. Costs shown are estimates based on the AI-supplied `cost` field × qty.

Confirm and I'll build it.