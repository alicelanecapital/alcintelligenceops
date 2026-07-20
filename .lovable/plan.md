## Root cause: Dr Botha's synopsis page never renders

The full-screen synopsis route (`/opportunities/$id/synopsis`) is registered by TanStack as a **child** of `/opportunities/$id`, but the parent route `src/routes/opportunities.$id.tsx` renders `<AppShell><OpportunityProfile /></AppShell>` with no `<Outlet />`. So when you open Botha's synopsis URL, the router matches the child route but the parent has nowhere to render it — you keep seeing the plain Opportunity profile page, which is why Sector / Stakeholder Brief / AI Overview / DISC / Red Flags all appear "missing".

Verified via the live DB and the browser client that Botha's data is present: `disc_profile` ✅, `ai_overview` ✅, 5 rounds each with `stakeholder_brief` ✅. Nothing is missing in the data — the synopsis page is just not being reached.

Sector shows a stray `"D"` at 20% confidence from round 1 (invalid sector code — not in `SECTOR_MODULES`) which the UI would still display verbatim, so I'll also gate it.

## Changes

1. **Un-nest the synopsis route from the opportunity profile**
   - Rename `src/routes/opportunities.$id.synopsis.tsx` → `src/routes/opportunities_.$id.synopsis.tsx`.
   - The trailing `_` on `opportunities_` tells TanStack file-based routing to opt out of the parent layout, so the synopsis becomes a top-level route at the same URL. No import changes needed for callers — the URL `/opportunities/$id/synopsis` stays identical. The Vite plugin will regenerate `routeTree.gen.ts`.

2. **Gate the "Sector Detected" block in `src/components/SynopsisContent.tsx`**
   - Only display a detected sector when the code resolves to a known `SECTOR_MODULES` entry AND confidence ≥ 50. Otherwise show the existing "Not detected yet…" copy. This suppresses Botha's spurious "D / 20%" reading.

3. **Un-bold contact names in `src/routes/contacts.index.tsx` (line 331)**
   - Drop `font-bold` from the primary name span; keep size and serif face.

## Out of scope

No data backfill or AI regeneration — the data for Botha already exists; only the route wiring was blocking it. The Round-1 sector will re-populate correctly on the next round analysis; the gating change just hides the low-confidence stub in the meantime.