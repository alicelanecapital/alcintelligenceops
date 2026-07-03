# Alice Lane Operations — Rebrand, Auth Bypass & Light Theme

## 1. Rebrand: "The Jungle" → "Alice Lane Operations"

Global find/replace across the app:
- `src/components/AppShell.tsx` — sidebar wordmark: "Alice Lane" (serif) with "Operations" eyebrow. Replace the botanical Sparkles mark with a simple monogram "A" tile in teal.
- `src/routes/__root.tsx` — page title `Alice Lane Operations · Origination Hub`, meta description updated.
- `src/routes/auth.tsx` — left-panel headline copy updated (kept as a route but unreachable via redirect, see §2).
- `src/routes/index.tsx` — AI narrative copy no longer references "The Jungle".

## 2. Bypass authentication

- `src/components/AppShell.tsx` — remove the `useAuth` gate; render the shell for everyone. Drop the "signed in as / sign out" footer, or replace with a static "Alice Lane · Internal" label.
- `src/lib/auth.tsx` — keep the provider so existing imports don't break, but stop redirecting. `user` can remain null; nothing in the app reads it after this change.
- `src/routes/auth.tsx` — leaves in place (harmless), but no route in the app links to it. If the user visits `/auth` we redirect to `/`.
- Queries in `src/lib/db.ts` continue to work because tables are seeded and RLS policies allow read access via the anon key (already in place from seed migration).

Note: this makes the app publicly readable to anyone with the URL. Confirm that's acceptable for the preview environment.

## 3. Light, minimal visual system

Rewrite `src/styles.css` tokens:

- **Background:** pure white `#FFFFFF`
- **Surface / card:** white with subtle `#F6F7F8` panels
- **Border / hairlines:** `#E7E9EC` (light grey)
- **Muted text:** `#6B7280`
- **Foreground / ink:** `#111827` (near-black, not navy)
- **Primary (teal):** `#0F766E` with a lighter `#14B8A6` accent and `#CCFBF1` tint for chips/highlights
- **Sidebar:** white background, `#111827` text, teal active state on a `#F1FBFA` pill (no more dark navy sidebar)
- **Charts:** teal-forward palette (`#0F766E`, `#14B8A6`, `#5EEAD4`, `#94A3B8`, `#111827`)

Layout tone:
- Increase page padding and vertical rhythm (more whitespace between KPI strip, cards, sections).
- Cards: white, 1px `#E7E9EC` border, no heavy shadows — at most a soft `0 1px 2px rgba(17,24,39,0.04)`.
- KPI strip: white cells separated by hairlines, no gold accent.
- Remove the gold/cream/leaf/clay tokens and their usages (Dashboard "Priority ecosystem plays" badge, pipeline bars, etc.) — swap to teal.

## 4. Typography: Cormorant Garamond everywhere

- Root route `head.links`: swap the Fraunces + Inter Google Fonts stylesheet for Cormorant Garamond (weights 400/500/600/700, plus italic).
- `src/styles.css`:
  - `--font-serif: "Cormorant Garamond", Georgia, serif;`
  - `--font-sans: "Cormorant Garamond", Georgia, serif;` (single-family site per request)
  - Body applies the family globally; headings keep the same family with tighter tracking and heavier weight for hierarchy.
- Tune sizes slightly (Cormorant reads smaller than Inter) — bump body to 15px, headings retain scale.

## 5. Component touch-ups from the palette change

- `src/components/PageHeader.tsx` — eyebrow uses teal `#0F766E` uppercase; H1 in Cormorant.
- `src/routes/index.tsx` — replace `bg-[var(--gold)]` badge and pipeline bar with `bg-teal-600` equivalents via the new `--color-primary` token.
- `src/routes/deals.tsx`, `analytics.tsx`, `ecosystem.tsx`, `events.tsx`, `founders.tsx`, `contacts.tsx` — audit for any hardcoded navy/gold/cream classes and rewire to the new semantic tokens. No structural changes.

## Out of scope
- Data model, seed data, AI features, and page structure are unchanged.
- No new routes, no new backend work.

## Open question
Bypassing auth means anyone with the preview URL can read all seeded contacts/founders/deals. Fine for now, or should I keep the login screen but auto-sign-in as a demo user?
