# Plan: Contacts / Calendar / DD / Requests polish pass

## 1. Contacts list & header (`src/routes/contacts.index.tsx`)
- Put the three header actions (Merge duplicates, Scan card / QR, Add contact) on a single flex row (no wrap) with `flex-nowrap` + responsive gap.
- On each contact row/card, render two inline pill badges next to the name:
  - **Type** badge: colour-coded per category (founder / investor / ecosystem / vendor / unknown) using a shared palette from a new `src/lib/contact-colors.ts`.
  - **Next meeting** badge (small, coloured): earliest upcoming `interviews.scheduled_at` (or `google_calendar_events` linked to the contact). Only shown when one exists.
- Fetch upcoming meeting dates in a batched query keyed by `contact_id`.

## 2. Contact detail page (`src/routes/contacts.$id.tsx`)
- **Source event frame**: move the "Met 7/13/2026" line here, under the event name. Remove it from the Details frame.
- **Status label/badge**: swap order so the coloured badge comes first, then the label "Status". Give `active` a green tone (and matching tones for other statuses) via `badge-colors.ts`.
- **Long URL wrap**: wrap `website` in a component that shows a short hyperlink (host + "…") linking to the full URL, with `break-all` fallback.
- **New "Stakeholder brief" frame** under Source event: AI-generated brief for the individual contact (reuse pattern from `stakeholder-brief.functions.ts`, new server fn `generateContactStakeholderBrief`). Cached on the contact row (new column `stakeholder_brief jsonb`).
- **New "Opportunities" frame** between Company description and Meeting history: lists opportunities still in workflow (not yet approved).
- Rename the existing bottom Opportunities frame to **"Approved Deals"**; filter to opportunities whose `current_stage = 'Approved'` (or `status = 'approved'`).

## 3. Calendar (`src/routes/calendar.tsx`)
- Colour-code meeting events by the linked contact's category using the same palette as the Contacts badge.
- Keep events green, tasks orange.
- Add a legend row at the top of the calendar (Events, Tasks, plus one chip per contact category).
- Meetings render as **fully shaded pastel** cells (pastel variant of the category colour).

## 4. Meetings screen (`src/routes/interviews.index.tsx` and/or calendar view there)
- Filter out public holidays from the meetings view (exclude `google_calendar_events` where `event_type = 'holiday'` or source calendar is a holidays calendar).
- Render remaining meeting cells fully shaded pastel.

## 5. DD Framework (`src/routes/dd-interview.$opportunityId.$round.tsx` + `DDInterviewEnhanced.tsx`)
- Change per-step section frames' border from grey (`border-border` / `border-muted`) to a forest-green class (`border-primary` mapped to forest green — see theme change below).

## 6. Request Info Modal (`src/components/RequestInfoModal.tsx`)
- Remove the "Open in Mail Client" step and the "Copy" button.
- Add inline **Send email** action that posts through a new server fn `sendRequestInfoEmail` (uses Resend via existing email infra; falls back to a clear error if not configured).
- Remove the "Create Opportunity" button. On successful send, automatically call `createOpportunityFromContact` and toast the result.

## 7. Accounts / Signatures (`src/routes/admin.accounts.tsx` + `profiles`)
- Add `email_signature text` column on `public.profiles`.
- Add a signature editor (textarea + preview) in Accounts.
- `sendRequestInfoEmail` appends the sender's signature to the outgoing HTML body.

## 8. Global theme — forest green lines
- In `src/styles.css`, retune `--border` (and `--input`, `--ring` where they read as lines) to a forest-green tone in both light and dark themes.
- Exception: calendar grid lines. Add a scoped override so the calendar container uses its current neutral grid colour (e.g. wrap calendar with a class that sets `--border` back to the previous neutral, or use explicit `border-neutral-200` on the grid cells).

## Technical notes
- New migration:
  - `alter table public.contacts add column stakeholder_brief jsonb;`
  - `alter table public.profiles add column email_signature text;`
  - Grants unchanged (existing policies cover new columns).
- New files:
  - `src/lib/contact-colors.ts` — category → {badge, pastel, border} tokens.
  - `src/lib/contact-brief.functions.ts` — `generateContactStakeholderBrief` server fn (auth-gated).
  - `src/lib/email.functions.ts` — `sendRequestInfoEmail` server fn.
  - `src/components/SmartLink.tsx` — short hyperlink component.
- Reuse existing patterns: `requireSupabaseAuth`, Lovable AI Gateway (`google/gemini-3-flash-preview`), badge components in `src/components/ui/badge.tsx`.
- No behavioural changes to auth, RLS, or unrelated modules.

## Open questions
1. For "Approved Deals", is the trigger `opportunities.current_stage = 'Approved'`, or should I add a distinct `approved_at` timestamp set when the DD workflow completes?
2. For sending email from Request Info modal — should I use the existing email domain infra (Resend) or wire a new SMTP secret? (Default: use the existing `email_domain` setup.)