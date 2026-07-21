## Changes

### 1. Admin → Accounts layout (`src/routes/admin.accounts.tsx`)
- Move the **Personal Booking Link** card so it renders **below the Email Signature** card.
- Bump the base font size on the Accounts page content by ~1pt (wrap page body in `text-[15px]`) so team roster, connections, and sub-calendar rows are readable.

### 2. Calendar visuals (`src/routes/calendar.tsx`)
- Render **Event** items as a **teal chip with white text** (`bg-teal-600 text-white`) instead of green. Update the legend swatch to match.
- Add a `title` attribute (and `truncate` on the visible label) on every calendar day pill so **hovering shows the full event/meeting name**.
- Show **sub-calendars** on the grid: `teamEvents` currently pulls only primary rows. Include every `google_calendar_events` row whose `calendar_id` isn't in the connection's `hidden_calendar_ids`, rendered with the owner's team colour.
- **Hard-code "Unavailable" masking**: if a synced Google event title contains any of `(smartify)`, `(nonastasia)`, or `(georgiaadams)` (case-insensitive), render the chip label AND the hover tooltip as **"Unavailable"** — real title is fully hidden.

### 3. Repetitive toasts
- **Calendar page**: stop auto-triggering sync from `SyncGoogleButton` on mount. Only toast on an explicit user click, and pass a stable sonner id (`toast.success(..., { id: "gcal-sync" })`) so repeat calls replace the previous toast instead of stacking.
- **Events discovery ("30 new events found")**: guard the notification behind a `localStorage` "last acknowledged count" so the same batch isn't re-announced on every visit / route change. Only toast when the count actually increases since last acknowledgement.

## Technical details

- Files touched: `src/routes/admin.accounts.tsx`, `src/routes/calendar.tsx`, `src/components/SyncGoogleButton.tsx`, and the events-discovery emitter (likely `src/routes/events.tsx` — grep on entering build mode).
- Small helper `maskUnavailable(title)` returns `"Unavailable"` when the title contains any flagged bracketed token, otherwise the original.
- Sonner dedupe via stable ids: `{ id: "gcal-sync" }`, `{ id: "events-discovered" }`.
