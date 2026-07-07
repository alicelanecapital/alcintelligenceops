## Phase 1 — Contacts + Meet + wiring into DD Engine

Angel Assistant repo (SmartifyConsulting/angelassistant) is private — I can't clone it. Phase 1 rebuilds the Meeting Workspace on top of this app's existing interviews infrastructure (transcription, utterances, analyses, notes, reports, doc requests are already implemented in `src/lib/interviews.ts` + `src/routes/api/transcribe.ts`), which covers most of the Angel Assistant feature list. Live Meeting Intelligence, transcript upload polish, and richer stakeholder analytics come in phase 2 once we can see the Angel Assistant source (make repo public, or paste key files).

Email sending (Resend), the configurable DD checklist, and the polished Request Information flow are phase 2.

### 1. Unified `contacts` table (migration)

New table `public.contacts` replacing Ecosystem + Founders + Vendors:

- Core: `id`, `name`, `category` (enum-like text: `founder | investor | ecosystem | vendor`, extensible), `company`, `position`, `email`, `phone`, `linkedin`, `website`, `notes`, `status`, `tags text[]`
- AI/relationship: `ai_summary`, `relationship_score int`, `last_interaction_at`
- Provenance: `source_event_id uuid → events(id)`, `date_met`, `organisation_id uuid → organisations(id)` (nullable), `owner_id uuid → auth.users(id)`
- `created_at`, `updated_at`

Data migration:
- Copy `organisations` rows where `kind='ecosystem'` → `contacts` with `category='ecosystem'`
- Copy `organisations` where category ~ vendor → `category='vendor'`
- Copy `founders` → `contacts` with `category='founder'`, preserve foreign key mapping into a `legacy_founder_id`/`legacy_org_id` column for reference (kept nullable) so `opportunities.founder_id` / `.company_id` continue to resolve during transition
- Backfill `date_met` from `created_at`

RLS: authenticated read/write; `GRANT` block for authenticated + service_role. No anon.

Add `contact_id uuid → contacts(id)` to `interviews`, `opportunities`, `meetings` (new table below). Keep existing `founder_id` FK for one release for safety.

### 2. Meetings (reuse interviews)

Rather than a parallel table, alias existing `interviews` as the meeting record. Add columns:
- `contact_id uuid → contacts(id)`
- `event_id uuid → events(id)` (nullable, inherited from contact)
- `meeting_type text` ('intro' | 'follow-up' | 'diligence')

The "Meet" button on a Contact creates an interview row via existing `startInterview` server fn (extended to accept `contact_id`/`event_id`), then navigates to `/interviews/$id` which is the meeting workspace with live transcription, notes, analyses, and reports already wired. Rename UI label from "Interview" → "Meeting" project-wide.

### 3. Routes & UI

**New:**
- `src/routes/contacts.tsx` — master list with Category filter tabs (Founder / Investor / Ecosystem / Vendor / All), search, Add/Edit/Delete dialog, "Meet" button per row
- `src/routes/contacts.$id.tsx` — Contact profile: info panel, Meeting History (interviews filtered by `contact_id`), Documents (from `documents` table), Source Event card, primary action buttons: **Meet**, **Create Opportunity**, **Request Information** (phase-1 stub → opens a modal that composes the email body + checklist and copies to clipboard / opens `mailto:`; Resend wiring in phase 2)

**Removed:**
- `src/routes/ecosystem.tsx`
- `src/routes/founders.tsx` + `src/routes/founders.$id.tsx`
- `src/routes/vendors.tsx`

**Updated:**
- `src/components/AppShell.tsx` sidebar: replace Ecosystem/Founders/Vendors entries with single **Contacts** entry
- `src/routes/events.tsx`: on an event row, add "Capture Contacts" action that opens the contacts add dialog pre-filled with `source_event_id`
- `src/routes/interviews.index.tsx`: show linked contact + event on each card
- `src/routes/opportunities.index.tsx`: new opportunities pre-populate `contact_id`, `event_id`, `meeting_id`, and copy latest AI meeting summary/notes into the opportunity description fields

### 4. Create Opportunity flow

On Contact page, **Create Opportunity** button:
1. Server fn `createOpportunityFromContact({ contactId })` gathers: contact info, source event, latest interview (meeting) + its report/analyses/notes, existing documents
2. Inserts `opportunities` row pre-filled with contact/org/event references + a `description` composed from the meeting AI summary, and `current_stage='Screening'`, `current_workflow_step=0`
3. Navigates to `/dd-engine/wizard/{oppId}` (already exists) so the opportunity flows into the DD Engine kanban and wizard with all prior context inherited

### 5. Request Information (phase-1 stub)

Modal on Contact page with:
- Editable email subject + body (auto-composed: greeting, meeting reference, DD progression note)
- Hardcoded default DD checklist (24 items from spec) with checkboxes
- Actions: **Copy to clipboard**, **Open in mail client** (`mailto:` with body), **Save draft** (persists a `document_requests` row linked to the contact/opportunity)
- No Resend send yet, no response tracking yet — added in phase 2

### Files to add / edit / remove

**Add**
- `supabase/migrations/<ts>_contacts_unification.sql` (create table, GRANTs, RLS, data migration, FK columns on interviews/opportunities)
- `src/lib/contacts.ts` — fetch/create/update/delete helpers
- `src/lib/contacts.functions.ts` — `createOpportunityFromContact`, `startMeetingForContact`
- `src/routes/contacts.tsx`, `src/routes/contacts.$id.tsx`
- `src/components/RequestInfoModal.tsx`

**Edit**
- `src/integrations/supabase/types.ts` (regenerated post-migration)
- `src/components/AppShell.tsx` (nav)
- `src/routes/events.tsx` (Capture Contacts button)
- `src/routes/interviews.index.tsx` (show contact/event)
- `src/routes/opportunities.index.tsx` (display new links)
- `src/lib/interviews.functions.ts` (accept `contact_id`, `event_id` on start)

**Delete**
- `src/routes/ecosystem.tsx`
- `src/routes/founders.tsx`, `src/routes/founders.$id.tsx`
- `src/routes/vendors.tsx`
- `src/lib/founders-data.ts` org helpers (moved into `contacts.ts`)

### Deferred to phase 2
- Live Meeting Intelligence (streaming AI insights during recording)
- Transcript file upload path (audio + text file → new interview)
- Resend integration + Request Information send + response tracking + saved sent-email log
- Configurable DD checklist (admin UI)
- Stakeholder Intelligence dashboard, relationship-signal scoring visualisations
- Any Angel-Assistant-specific UI patterns (needs repo access)
