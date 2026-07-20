
## 1. Navigation restructure (`src/components/AppShell.tsx`)
- Rename **CRM → Operations**; merge Meetings and Deal Pipeline into it; remove the standalone **Due Diligence Engine** group.
- Rename Admin item **DD Framework → DD Intelligence Engine** (label only; `/admin/dd-framework` path unchanged).

## 2. Dashboard frame removal (`src/routes/index.tsx`)
Strip `Card`/`CardHeader`/`CardContent` wrappers from tiles; keep layout and content as plain sections.

## 3. Rich-text email signature with logo paste
- `src/routes/admin.accounts.tsx`: replace `EmailSignatureCard`'s `<Textarea>` with a `contentEditable` HTML editor that accepts pasted HTML (sanitized allow-list: `p, br, span, strong, em, a, img, div`) and pasted image files (converted to `data:image/*`); saves HTML into `profiles.email_signature`.
- `src/lib/email.functions.ts`: if signature contains HTML tags, append it raw in the `html` payload and a tag-stripped version in `text`.

## 4. Show sub-calendars in Accounts
- New server fn `listGoogleSubCalendars` (in `src/lib/google-calendar-sync.functions.ts`) that calls `GET /calendar/v3/users/me/calendarList` for the caller's connected Google account and returns `[{ id, summary, primary, backgroundColor, accessRole }]`.
- In `AccountsScreen`, under each connected account row, render a collapsible **Calendars** list (read-only) with colour swatch and primary badge.

## 5. Meeting classification by attendee domain (`src/routes/interviews.index.tsx`)
- Add `classifyCalendarEvent(ev)`: collect attendee + organizer emails → **Private** if every non-owner attendee is `@alicelanecapital.com` (or the event is solo); **Client** otherwise.
- Merge deduped upcoming Google Calendar events into the two existing meeting columns; **remove the standalone "Events" section** from `interviews.index.tsx`.
- Calendar-sourced rows are read-only (badge "Calendar", owner colour chip, join link) and excluded from Start/Dismiss actions.
- Public-holiday filtering stays as-is.

## 6. Accounts list styling (`src/routes/admin.accounts.tsx`)
- Remove the outer border and row dividers on the accounts list: drop `border border-border divide-y divide-border` from the list container (keep `bg-card` spacing only, or plain spacing).
- Remove the inner box on Email Signature: change `EmailSignatureCard` from a `Card` shell to a plain `<section>` (no border, no `CardContent` padding box) — keep the heading, editor field, helper text, and Save button.

## 7. Deal Pipeline card density & font size (`src/routes/dd-engine.tsx`)
Re-apply the earlier compaction that isn't visible in the preview:
- Card padding: `CardContent` `p-5 → p-2`; internal `mt-4` gap → `mt-2`; button/badge row on the same line already.
- Photo: `h-10 w-10 → h-7 w-7`; icon `h-5 w-5 → h-3.5 w-3.5`.
- Name font: `font-serif text-lg → font-serif text-sm` (down ~2pt as requested).
- Company line: `text-xs → text-[11px]`, `mt-1 → mt-0.5`.
- Action buttons: keep `h-7 w-7` icons; Begin/Resume button `size="sm"` → compact height `h-6 px-2 text-[11px]`.
- Round badge: `text-[11px] → text-[10px]`, tighter padding.

Net effect: card height roughly one-third of the current version, name/company font reduced by ~2pt, matching earlier request.

## Technical notes
- No schema changes.
- Route paths unchanged: `/dd-engine`, `/interviews`, `/admin/dd-framework`.
- Rich-text editor stays dependency-free.
- Sub-calendar listing cached via React Query (5-minute stale time).
