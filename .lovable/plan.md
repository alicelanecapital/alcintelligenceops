## Scope

Multiple UI/nav/label refinements plus a new admin "Intelligent Toolkits" abstraction that generalises the current DD Intelligence Engine.

---

### 1. Global font size — 12px on framed content

- Add a utility class `.frame-12` (or reuse Tailwind `text-[12px]`) applied to every card/frame body across the app. To keep scope tight and avoid touching every component, set a base rule in `src/styles.css` targeting the frame wrappers we already use (Card, accordion content, dialog content, list items in Deal Pipeline / Meetings / Contacts / Live Workspace / Synopsis).
- Headings/eyebrows/badges retain their current sizes; only body/text-in-frame moves to 12px.

### 2. Eyebrow / section-heading renames

- `src/routes/events.tsx` — eyebrow above "Current Events": `DISCOVERY` → `NETWORK`.
- `src/routes/interviews.index.tsx` — page eyebrow: `Diagnostic Engine` → `DISCOVERY`. Heading stays "Meetings".
- `src/routes/dd-engine.tsx` — eyebrow: `Diligence` → `DUE DILIGENCE`.

### 3. Meetings accordion grouping

- `src/routes/interviews.index.tsx`: remove the `"Last week"` bucket. Anything older than "Today" / "Next week" falls into its month bucket (e.g. `June 2026`) via the existing month key. `bucketOf` becomes: Today → Next week → `<MonthName YYYY>`.

### 4. Live Workspace frame changes (`src/routes/interviews.$id.tsx`)

- Remove the `LIVE` badge on the meeting record header and remove the standalone Stop button in the header area (Stop remains inside the Live Transcript frame per prior plan).
- Manual Assessment and Body Language frames:
  - Default collapsed (accordion `defaultValue` no longer includes them).
  - Border + header tinted the same pastel orange used for the `Medium` score badge (amber-200 border, amber-50 background on header) to signal "manual input".

### 5. Nav rename + new admin section

- `src/components/AppShell.tsx` admin nav: rename "DD Intelligence Engine" to **"Intelligent Toolkits"**, positioned just above Accounts.
- Route move: `/admin/dd-framework` becomes one record within the new toolkits area.

New data model (migration):

```text
toolkits             (id, name, description, kind, sort_order, created_at)
toolkit_rounds       (id, toolkit_id, round, sort_order, title, subtitle, purpose, duration)
toolkit_questions    (id, toolkit_id, round, sort_order, question_text, why_text, internal_steps, red_flags)
toolkit_documents    (id, toolkit_id, round, sort_order, name, purpose)
```

- Seed a single toolkit row `DD Intelligence Engine` (kind=`due_diligence`) and copy the existing `dd_framework_rounds/questions/documents` rows into `toolkit_*` linked to that toolkit id. Legacy tables stay untouched so the live DD flow keeps working; the admin UI reads/writes via the new tables against the DD toolkit's id.
- GRANTs + RLS: same pattern as existing framework tables (`authenticated` read/write via team-membership check; `service_role` all).

New routes:

- `src/routes/admin.toolkits.index.tsx` — list of toolkits with CRUD (create / rename / delete / reorder). "DD Intelligence Engine" appears as a row here.
- `src/routes/admin.toolkits.$id.tsx` — the existing round/question/document designer (reuse the current `admin.dd-framework.tsx` UI, parametrised by `toolkit_id`).
- Keep `/admin/dd-framework` as a redirect to the DD toolkit's detail page so existing links don't break.

Data-access layer:

- New `src/lib/toolkits-admin.ts` mirroring `src/lib/dd-framework-admin.ts` but scoped by `toolkit_id`. The DD interview runtime (`src/routes/dd-interview.*`, `src/components/DDInterviewEnhanced.tsx`, `src/lib/dd-framework-data.ts`) is unchanged in this pass — it keeps reading `dd_framework_*`. A follow-up can migrate the runtime to read from `toolkit_*` once the admin UI is stable.

---

### Technical notes

- 12px is applied via a scoped CSS rule so we don't have to edit dozens of components; verify with the running preview after the change.
- Toolkits migration keeps `dd_framework_*` intact to avoid regressions in the live DD interview.
- Amber tint uses existing token pattern (`border-amber-200`, `bg-amber-50/50`) to match the `Medium` badge already in use.

### Out of scope

- Rewiring the live DD interview to read from `toolkit_*` (done later once toolkits UI is proven).
- Any changes to Contacts, Calendar, or Deal Pipeline lists beyond the eyebrow rename.