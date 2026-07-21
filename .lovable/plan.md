## 1. Nav & headings

- `src/components/AppShell.tsx`: rename the "Meetings" nav item to **Engagements** (keeps `/interviews` route).
- `src/routes/interviews.index.tsx`: change `PageHeader` eyebrow to **"Diagnostic Engine"** and title to **"Engagements"**.

## 2. Meetings screen scope

In `src/routes/interviews.index.tsx`:
- **Private & Client meetings**: filter both `q.data` interviews and `calendarPrivate` / `calendarClient` calendar rows to the **current month only** (by `start_time` / `created_at` within `startOfMonth(now)`–`endOfMonth(now)`).
- **Events**: keep current logic but expand to the **entire current year** (drop the `end >= today` cut, filter to `start_date` within the year).
- **Recurring meetings**: exclude from the Private list only. A calendar event is "recurring" when it has `recurring_event_id` or `recurrence` populated (available on `google_calendar_events`). Calendar rendering unchanged.

## 3. Calendar — Georgia's colour

In `src/lib/team-members.ts` (or wherever `TeamMember` seed/colour resolution lives) ensure `georgia@alicelanecapital.co.za` resolves to `orange`. If already stored in `team_members`, update her row via a small server-fn/one-off; otherwise add an override map in `src/routes/calendar.tsx`'s `resolveColor` so `georgia@alicelanecapital.co.za → "orange"`. Legend picks this up automatically because it reuses `resolveColor`.

## 4. Contact detail tabs

In `src/routes/contacts.$id.tsx`:

**Tab order becomes:**
1. AI Overview
2. Stakeholder Brief *(new dedicated tab)*
3. Live Workspace
4. Documents
5. Meeting History
6. Red Flags *(moved out of tabs? — see below)*  
7. Approved Deals
8. Notes *(moved to end)*

Actually per request:
- **Red Flags** moves *into* the AI Overview tab (remove its own tab).
- **Stakeholder Brief** becomes its own tab, right after AI Overview, auto-populated on mount (fires `briefMut.mutate(false)` via `useEffect` when `!c.stakeholder_brief && !briefMut.isPending`).
- **Notes** tab moves to the end.

**AI Overview restructuring:** wrap Sector, Company Description, DISC Profile, Opportunities-in-workflow, and the newly-added Red Flags panel in a shadcn `Accordion` (`type="multiple"`, all items collapsed by default). Stakeholder Brief section is removed from this tab (now its own tab).

The existing `RedFlagsTab` component is reused inside the AI Overview accordion.

## Technical notes
- No schema changes.
- Auto-generate brief: guarded `useEffect` in the Stakeholder Brief tab component so it only fires once per contact when brief is empty.
- Recurring detection: check `ev.recurring_event_id ?? ev.recurrence?.length` on the google row.
- Month/year windows computed once via `date-fns` `startOfMonth/endOfMonth/startOfYear/endOfYear`.
- Georgia colour: prefer updating the `team_members` row so it's persistent across the app; fall back to a client override only if she isn't in the roster yet.