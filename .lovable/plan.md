
# Founder & Company Intelligence (Module 4)

Build the central relationship system for Alice Lane Operations. Founders are the hub — every company, contact, opportunity, meeting, interview, document, task, note and event connects back. Extend (not replace) the existing schema and pages, keep the current white/teal/Cormorant design language, and layer AI intelligence throughout.

## Data model — new & extended tables

Extend existing `founders`, `organisations` (as Companies), `contacts`, `deals` (as Opportunities), `events`, `interviews`. Add:

- `companies` — separate legal-entity model (multiple companies per founder). Registration number, industry, province/country, founded, employees, revenue band, investment stage, status, relationship owner. (Kept distinct from `organisations` which stays for ecosystem partners.)
- `founder_companies` — many-to-many founder↔company with role (founder / co-founder / advisor).
- `opportunities` — richer than existing `deals`: founder_id, company_id, name, industry, current_stage, assigned_partner, priority, estimated_investment, probability, created_at. (Existing `deals` becomes the pipeline projection; opportunities carry the profile detail.)
- `meetings` — founder/company/opportunity linkage, date, location, attendees[], agenda, transcript, recording_url, summary, decisions, action_items, outcome.
- `tasks` — linked to founder/company/opportunity, title, due, assignee, status, priority.
- `notes` — rich text body, author, tags[], mentions[], attachments[], linked to any entity.
- `documents` — file storage (Lovable Cloud bucket `founder-docs`), type enum (Pitch Deck, Business Plan, Financials, Bank Statements, Tax, Legal, Registration, Marketing, Contracts, Images, Videos), version, tags, ai_summary, linked entity.
- `document_comments`, `document_versions`.
- `communications` — email/call/message log per founder.
- `timeline_events` — unified activity stream (source_type, source_id, actor, ts, payload). Populated by triggers from meetings/notes/tasks/documents/interviews/deals so the Timeline tab is one query.
- `relationship_signals` — computed per founder: last_contact_at, days_since, interaction_count_90d, strength_score, updated_at.
- `founder_intelligence` — AI panel cache: snapshot, recent_developments, relationship_health, open_commitments[], knowledge_gaps[], next_best_actions[], generated_at, source_hash.
- `investments` — per company/opportunity: amount, date, instrument, valuation, status.
- `entity_merges` — duplicate detection queue: entity_type, candidate_ids[], score, status.

RLS on all — `authenticated` read/write, `service_role` full. Grants per project rules. Storage bucket private, signed URLs via server fn.

## Server functions (`src/lib/founders.functions.ts`, `companies.functions.ts`, `intelligence.functions.ts`)

- `getFounderProfile(id)` — founder + companies + opportunities + relationship signals + latest intelligence.
- `getFounderTimeline(id, cursor)` — paginated unified stream.
- `upsertMeeting`, `upsertNote`, `upsertTask`, `upsertCompany`, `upsertOpportunity`, `addContact`, `logCommunication`.
- `uploadDocument` + `summariseDocument` (Gemini) → writes `ai_summary`.
- `refreshFounderIntelligence(id)` — Gemini 3 Flash structured output: snapshot / recent developments / health / commitments / gaps / next actions. Triggered on entity mutation (debounced) and manual "Refresh".
- `detectDuplicates(entity_type)` — nightly-safe fn using embeddings + fuzzy match; writes to `entity_merges`.
- `mergeEntities(type, keep_id, drop_ids)`.
- `generateReport(kind, id)` — Founder Summary, Company Summary, Relationship, Meeting History, Contact Directory, Opportunity, Timeline. Returns printable HTML.
- `globalSearch(q, filters)` — cross-entity search.

## Routes / screens

```text
/founders                       existing → upgrade list w/ filters + search + saved views
/founders/$id                   NEW premium profile (header + 12 tabs)
/founders/$id/companies/$cid    embedded, or:
/companies                      NEW list
/companies/$id                  NEW profile (header + 10 tabs)
/opportunities                  NEW list (separate from Deal Flow kanban)
/opportunities/$id              NEW profile (header + 10 tabs)
/relationship-map               NEW global graph
/reports                        NEW report generator
```

### Founder Profile (`/founders/$id`)

- **Header**: photo, name, current company chip, stage, location, industry, status, assigned partner, relationship strength meter, first-met date, current investment stage. Quick Actions rail (Meeting, Interview, Upload Doc, Note, Task, Add Company, Create Opportunity, Send Email, Add Contact, Generate Brief).
- **Left column — Founder Intelligence panel** (always visible, sticky): Snapshot, Recent Developments, Relationship Health gauge, Open Commitments checklist, Knowledge Gaps, Next Best Actions. "Refresh" + "generated 3h ago" stamp. Teal chip = AI-generated.
- **Right column — Tabs**: Overview · Timeline · Companies · Meetings · Interviews · Assessments · Documents · Contacts · Tasks · Notes · Events · Communications · Investments. Each tab is a lazy component under `src/components/founder/tabs/`.

### Company Profile — same shape, 10 tabs per spec, Overview covers business model / customers / registration / VAT / funding.

### Opportunity Profile — 10 tabs, Relationship Intelligence panel (strength, last contact, days since, intros, events together, referrals, shared connections, next suggested action).

### Relationship Map (`/relationship-map`)

Force-directed graph (reuse the existing ecosystem SVG approach, upgraded to `react-force-graph-2d`). Node types: Founder / Company / Organisation / Investor / Mentor / University / Accelerator / Contact. Click → drawer with entity summary + open profile. Filters by node type and relationship strength.

### Duplicate detection

Banner in list views ("3 possible duplicate founders") → merge review modal with side-by-side diff + AI reasoning + Merge/Ignore.

### Global search & filters

Command-K palette across founders/companies/contacts/opportunities/organisations with the filter set from the spec. Saved filters per user.

## AI Founder Intelligence — how it stays current

- On every write to meetings/notes/tasks/documents/interviews/assessments touching a founder, a Postgres trigger inserts into `timeline_events` and enqueues a `founder_intelligence_refresh` job (simple `pg_notify` + client-side debounce initially).
- `refreshFounderIntelligence` fetches the last N timeline events + latest interviews/reports + open tasks/commitments, sends a structured Gemini call, stores JSONB, updates `source_hash`.
- Panel shows stale badge if `source_hash` ≠ current signals hash; one-click refresh.

## Design

Existing white / light-grey / teal palette + Cormorant Garamond headings. Interior workspace uses Inter for dense data (matches interview module). No dark theme. Component reuse: `Card`, `Tabs`, `Table`, `Sheet`, `Command`, `Dialog`.

## Phasing

1. Schema + storage bucket + triggers + timeline stream.
2. Founder Profile shell + Overview / Timeline / Companies / Notes / Tasks / Documents tabs.
3. Company Profile + Opportunity Profile.
4. Meetings + Interviews wiring (link existing `interviews` in the Interviews tab).
5. Founder Intelligence panel + server fn + auto-refresh.
6. Relationship Map, Duplicate Detection, Reports, Global Search.

## Open questions

1. **Companies vs Organisations** — spec separates *Company* (portfolio/investee) from *Organisation* (ecosystem partner). OK to introduce a new `companies` table and keep existing `organisations` for ecosystem only? (Alt: reuse `organisations` and filter by kind — cheaper but muddier.)
2. **File storage** — enable a private Lovable Cloud storage bucket for `founder-docs` with signed URL access, ~50 MB limit per file?
3. **Auth** — module currently public per your earlier request. Notes are meant to be "private" per spec. Keep everything public with author metadata only, or gate `/founders`, `/companies`, `/opportunities` behind auth?
4. **Phasing** — build all 6 phases in one pass, or ship phases 1–2 first (profile shell + core tabs + intelligence panel) and follow with map/duplicates/reports?
