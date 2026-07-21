## Goal

Clicking **View Synopsis** on a Deal Pipeline row should open a dedicated full-page screen that reliably renders Sector, Stakeholder Brief, AI Overview, DISC and Red Flags. Today it navigates to `/opportunities/$id/synopsis` but the page appears blank/broken.

## Diagnosis

The route (`src/routes/opportunities_.$id.synopsis.tsx`) is wired correctly and registered in the route tree. The blank page comes from the data layer in `src/components/SynopsisContent.tsx`:

```ts
.select("*, founder:founders(name, startup_name, sector), company:companies(name, industry)")
```

After the Contacts refactor, opportunities are linked to `contacts`, not `founders`/`companies`. PostgREST returns an error for the missing `founder`/`company` relationships → `q.data` is `undefined` → the page falls through to a blank state with no header, no sections, no error message. That matches "navigates to a page but it looks blank / broken".

Verified separately that the underlying data for this opportunity (Dr Botha) is present on the row: `disc_profile`, `ai_overview`, per-round `stakeholder_brief`. So once the fetch is fixed, the sections will populate.

## Fix

1. **Rewrite the synopsis fetch** in `SynopsisContent.tsx` to match the current schema:
   - Select from `opportunities` without the broken `founder`/`company` joins.
   - Join `contact:contacts(name, company_name, sector, sector_confidence)` instead.
   - Derive `founderName` from `contact.name ?? opp.name`, `companyName` from `contact.company_name`.
   - Fall back to `contact.sector`/`contact.sector_confidence` when no round-level detection exists.
   - Show a visible error state (not a blank div) if the query fails.

2. **Harden the screen wrapper** (`src/routes/opportunities_.$id.synopsis.tsx`):
   - Render the header (title + Back + Download PDF) unconditionally, before the content query resolves, so the screen is never a completely empty page.
   - Add `errorComponent` and `notFoundComponent` to the route (currently missing) so any downstream throw shows a branded fallback rather than a white page.

3. **Delete the unused modal** `src/components/OpportunitySynopsisDialog.tsx` and confirm no imports remain, so there is a single source of truth for the synopsis view.

4. **Tighten the trigger** in `src/routes/dd-engine.tsx`:
   - Keep the existing `<Button>` navigation but also let the whole row be clickable to open the synopsis (except when clicking the inline action buttons), matching the earlier "click anywhere on a Deal Pipeline record" intent.

## Out of scope

- No changes to how DISC / AI Overview / Stakeholder Brief are generated.
- No schema changes; sector confidence gate (≥ 50%) stays as-is.
- No styling changes to the synopsis section cards.

## Verification

- Click **View Synopsis** on Dr Botha's row → dedicated screen loads with header, Sector ("Not detected" — confidence is 20 %), Stakeholder Brief, AI Overview (summary/strengths/risks/recommendation), DISC (D 78 / I 65 / S 25 / C 35), Red Flags ("none detected").
- Refreshing `/opportunities/<id>/synopsis` directly still renders the screen.
- Download PDF still produces a file named after the contact.
