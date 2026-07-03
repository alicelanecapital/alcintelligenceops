
# Origination Hub — "The Jungle"

An internal-only intelligence platform for Alice Lane Capital that turns events, relationships and founder interactions into a repeatable deal flow engine.

## Design direction (from uploaded mockup)

Every screen matches the reference mockup exactly:

- **Brand**: "THE JUNGLE — Where startups grow", small hand-drawn tree logo top-left of sidebar.
- **Palette**: cream/off-white background (`#FBF8F1`), deep navy sidebar & primary text (`#0B1F3A`), muted olive/sage accents, soft gold/amber for AI-score stars, subtle status pills (green=Registered, amber=Interested, blue=Researching, plum=Attended).
- **Typography**: elegant serif for section titles ("Good morning, Georgia & Tendai."), clean humanist sans for body/table content. Generous whitespace, thin hairline dividers.
- **Left sidebar** (fixed ~220px): WORKSPACE (Dashboard), ORIGINATION (Events, Deal Flow, Founders, Ecosystem, Organisations, Contacts, Pipeline, Analytics), user card pinned bottom.
- **Dashboard** = editorial layout: large serif greeting + date, 3 KPI insight cards, then AI briefing list. Botanical line-drawing floats top-right.
- **Events**: 5-across KPI strip, filter chip row, dense table with gold-star AI score column and coloured status pills. Top-right "AI Suggestions" + "+ Add Event".
- **Event Detail**: cover poster + meta table on left, Actions rail (Outlook/Google/Apple Calendar, Generate Meeting Brief/Travel Checklist/Networking Targets/Questions) on right. Tabs: About, Speakers, Sponsors, Attendees, AI Summary, Notes.
- **Deal Flow**: horizontal kanban, columns with count chips, coloured initials avatars on cards.
- **Founder Profile**: photo + name + LinkedIn left, meta grid right. Tabs Overview / Timeline / Documents / Connections / Notes. AI Investment Score with stars.
- **Founder Timeline**: dated vertical timeline, Documents + Meetings side panels.
- **Ecosystem Map**: SA outline with numbered province bubbles (Leaflet + SA GeoJSON), 22-category left panel with counts, "View as Network" toggle to force graph.
- **Organisation Profile**: logo + category chip, 4-tile metric grid (Relationship Strength, Referral Potential, Trust Score, Strategic Importance, SME Quality, Deals Generated). Tabs: Overview / Contacts / Introductions / Deals / Notes & History. Recent Activity feed.
- **Pipeline Analytics**: 3×2 chart grid — Top Referral Sources (donut), Pipeline by Stage (donut w/ big centre number), Deal Flow Trend (line), Top Industries (bars), Investment Readiness (donut), Response Time (giant number + delta).

All colours implemented as semantic tokens in `src/styles.css`. Serif `@fontsource/fraunces`, sans `@fontsource/inter`.

## Phase 1 — Foundation (this build)

### 1. Enable Lovable Cloud
Database, auth, edge functions, cron scheduler, Lovable AI Gateway (Gemini).

### 2. Auth & role gating
- Email + password on `/auth`.
- `app_role` enum (`admin`, `member`), `user_roles` table, `has_role()` security-definer function.
- First signup auto-promoted to `admin`; admins invite/promote from Team Settings.
- All `/origination/*` routes gated by `_authenticated` layout + role check.

### 3. Navigation & shell
Matches mockup — THE JUNGLE logo, WORKSPACE and ORIGINATION groups, user card bottom. Origination hidden for non-internal.

### 4. Database schema (all RLS-protected)
- `profiles`, `user_roles`
- `organisations` — name, logo, **kind** (`ecosystem` | `sme`), category (22 ecosystem categories + "SME"), industry, province, website, primary_contact_id, relationship_strength, trust_score, strategic_importance, sme_quality, response_rate, ai_relationship_score, last_contact_at, next_action, purpose, who_they_serve, selection_criteria, funding_available, engagement_playbook, notes, owner_id, source
- `contacts` — name, email, phone, linkedin, organisation_id, role, owner_id, notes
- `founders` — contact_id, organisation_id, photo, linkedin, startup_name, sector, location, stage, revenue, employees, funding_sought, website, pitch_deck_url, problem, solution, traction, referral_source, why_interesting, ai_investment_score, internal_notes
- `events` — name, start/end_date, venue, country, city, cost, cost_type, website, registration_link, industry[], expected_audience, ai_score, ai_summary, ai_factors jsonb, source_url, status, owner, discovered_at, cover_image_url
- `event_attendees` — event_id, contact_id, notes, photos[]
- `deals` — founder_id, organisation_id, source, referral_contact_id, investment_size, investment_stage, priority, ai_investment_score, stage (11-value enum), owner_id
- `deal_activity` — deal_id, kind, payload jsonb, created_by, created_at
- `relationships` — from/to id+type, kind
- `daily_briefings` — date, user_id, content jsonb, model, generated_at

### 5. Six module pages (styled to match mockup, full CRUD)

- **Events** — KPI strip + filter chips + table + status kanban toggle + event detail + post-event capture form that auto-creates Contact + Organisation + Founder + Deal.
- **Deal Flow** — 11-column kanban, drag-drop (`@dnd-kit/core`).
- **Founders** — list + profile matching reference exactly.
- **Ecosystem** — Leaflet SA map + 22-category panel, plus Table, Network Graph (`react-force-graph-2d`), Bubble Chart, Relationship Matrix. **Scoped to `organisations.kind='ecosystem'`.**
- **Organisations** — unified list of all organisations with `kind` filter (SME / Ecosystem / All) plus category filter. Organisation profile matches reference (metric tiles, tabs, Recent Activity).
- **Contacts** — unified searchable directory.
- **Pipeline Analytics** — 3×2 chart grid matching reference.

### 6. Dashboard = AI Daily Briefing (matches reference)
Editorial layout, serif greeting, 3 KPI insight cards, AI briefing list. Generated per-user per-day by edge function using Gemini (`google/gemini-3-flash-preview`). Cached in `daily_briefings`. Manual "Regenerate".

### 7. AI Event Discovery (nightly)
- Edge function `discover-events` via pg_cron 02:00 SAST, hitting `/api/public/cron/discover-events` behind `CRON_SECRET`.
- Lovable AI Gateway (Gemini w/ web search grounding), three regional prompts (SA / Africa / Global) covering the 30+ event categories.
- Per event: dedupe on (name + start_date), enrich, AI score 1–5 via rubric weighting founders, investors, speakers, networking, SME relevance, innovation, deal flow potential; write AI summary. Inserts `status='interested'`, `owner='both'`.
- Manual "Discover now" for admins.

### 8. AI scoring & recommendations
- On event insert → AI score + summary.
- On founder create/update → investment-fit score.
- On organisation create/update → 7-factor relationship score.
- Global `⌘K` search via Postgres FTS + trigram.
- Dashboard recommendations: warm intro paths, duplicate detection, relationship gaps.

### 9. Head metadata
Title "The Jungle — Alice Lane Capital" on `__root.tsx`; `noindex` on all origination routes.

## 10. Seed data from `MSME_Selection_List.xlsx`

The uploaded workbook has 57 rows in one flat list mixing two record types. Import as a one-shot migration (`supabase--insert`) with explicit classification — **not** all dumped as "founders":

**Classification heuristic** (applied per row):

- **`organisations.kind = 'ecosystem'`** when the row's Industry field is a descriptive paragraph (>60 chars) OR the Company Name contains any of: `Foundation`, `Hub`, `Incubation`, `Incubator`, `Institute`, `Academy`, `Fund`, `Ministry`, `Minister of`, `Community`, `Capital`, `Programme`, `NPC`, `NPO`, `Jet`, `Endeavor`, `Enactus`, `Lab`.
  → Rows 18–21, 26–27, 32–33, 35–39, and all rows 40–60 (~30 orgs).
  → Written with `category` mapped to Universities / Accelerators / Incubators / Government / DFIs / NGOs / Innovation Hubs / Angel Networks / VC Funds / Foundations, `purpose` = the description text, `fit_rating` = the workbook's "Fit" column, `status` = the workbook's "Status" column, `source = 'MSME_Selection_List.xlsx'`.

- **`organisations.kind = 'sme'`** for all other rows (short single-word industry like Accounting, Architecture, Beauty, Automotive, Construction, Retail, Technology).
  → Rows 4–17, 22–25, 28–31, 34 (~22 SMEs).
  → Written with `category = 'SME'`, `industry` set, and — because these are potential deal-flow candidates — also create a matching **`founders`** row (startup_name = company, sector = industry, `referral_source = 'MSME Selection List'`) and a **`deals`** row in stage `New Opportunity` linked back to the org and founder, so they show up on the Deal Flow kanban on day one.

- Every row with a Contact name creates a **`contacts`** row linked to its organisation (with email/phone/website parsed from the "Contact Number/Email Address/Website" column when present).

- All seeded records get `owner_id = NULL` (assignable in-app) and a note in `internal_notes` preserving the original workbook status/action text so nothing is lost.

The migration runs once on Cloud enablement; SMEs land on Deal Flow, ecosystem orgs land on the Ecosystem Map with counts populated per category.

## Technical notes

- Stack: TanStack Start + Lovable Cloud + Lovable AI Gateway (Gemini). No third-party APIs required.
- AI calls in server functions (`src/lib/*.functions.ts`) via `createLovableAiGatewayProvider` helper — never client-side.
- Fonts: `@fontsource/fraunces` + `@fontsource/inter`.
- Map: Leaflet + SA GeoJSON. Graph: `react-force-graph-2d`. Charts: recharts. Kanban: `@dnd-kit/core`.

## Not in this build

- Email/calendar/LinkedIn integrations (per-user OAuth).
- Automated follow-up sequences.
- Pitch-deck AI extraction (upload works; parsing later).
- Mobile app.

Approve to build.
