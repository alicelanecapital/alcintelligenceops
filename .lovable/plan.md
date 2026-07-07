## Plan: Ecosystem/Founders/Vendors CRUD + Events overhaul

### 1. Full CRUD

**Ecosystem** (`src/routes/ecosystem.tsx`) — currently has Delete only. Add:
- "Add organisation" button in header → opens Add/Edit dialog
- Wire the existing Edit button (currently non-functional) → opens same dialog
- New `createOrganisation` / `updateOrganisation` helpers in `src/lib/founders-data.ts`
- Dialog covers: name, category, industry, purpose, who_they_serve, fit_rating, status, province, city, notes

**Founders** (`src/routes/founders.tsx`) — currently read-only. Add:
- "Add founder" button → dialog (name, startup_name, sector, stage, email, phone, website, description, referral_source)
- Edit + Delete buttons on each card / list row → dialog + confirm delete
- Uses existing `createFounder`, `updateFounder`, `deleteFounder`

**Vendors** (`src/routes/vendors.tsx`) — already has CRUD. Verify Add/Edit/Delete work, no changes needed unless bugs surface.

### 2. Events module

`src/routes/events.tsx` + `src/lib/event-discovery.ts`:

- **Status filter**: already present — verify it filters within both region tabs correctly (bug: table shows all `futureEvents` in both tabs, not filtered per region). Fix by filtering table rows by region inside each `TabsContent`.
- **Currency**: `formatCurrency` already returns `R…`. Audit the edit modal ("Cost (R)") and table cell — remove any duplicate "R" prefix if the stored value contains one. Ensure only `R{value}` shown.
- **Additional info displayed**: table already has Dates + Attendees columns. Also expose Start / End / Who Will Attend prominently in a card-style expandable row or add explicit "Start" and "End" columns split from combined "Dates". Show `who_you_meet` truncated with tooltip full text.
- **Book button**: already exists when `e.website` is set — keep, ensure it opens in new tab (already does).
- **Remove Score column + scoring modal + `SCORING_CATEGORIES` + `total_score` field usage** from UI. Remove Score TableHead/TableCell, remove `onScore` prop, remove `showScoringModal` state and Dialog. Keep DB column intact.

**Fix AI Event Discovery** (`src/lib/event-discovery.ts` is broken):
- File imports `openai` SDK but calls Anthropic-shaped API (`openai.messages.create`, model `claude-3-5-sonnet-…`) — this fails at runtime. Also runs client-side reading `process.env.OPENAI_API_KEY` (undefined in browser).
- Rewrite as a **server function** `src/lib/event-discovery.functions.ts` using **Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`, model `google/gemini-2.5-flash`, `LOVABLE_API_KEY` from `process.env`).
- Server fn returns `{ sa: Conference[], global: Conference[] }`. Prompt asks for **two arrays**: 15 SA sector-specific conferences (Mining-Indaba-tier: prestige, senior attendees, deal-making, international influence) and 15 Global conferences matching the same criteria.
- Delete broken `src/lib/event-discovery.ts`.
- Update `events.tsx` "Run discovery" mutation to call the server fn via `useServerFn`, and insert results tagged with correct `region` ("SA" | "Global"). No longer sets `total_score`.

### 3. Technical notes

- No DB migration required (schema already supports needed columns).
- Server fn is public (no auth needed) since events are org-wide utility data — mirrors existing pattern.
- New helpers in `founders-data.ts`: `createOrganisation`, `updateOrganisation`.

### Files to edit
- `src/lib/founders-data.ts` (add org create/update)
- `src/lib/event-discovery.functions.ts` (new server fn)
- `src/lib/event-discovery.ts` (delete)
- `src/routes/ecosystem.tsx` (add + edit dialog, wire buttons)
- `src/routes/founders.tsx` (add/edit/delete dialogs + buttons)
- `src/routes/events.tsx` (remove scoring, fix region filter, wire new discovery fn)
