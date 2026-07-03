## 1. Import events from AfricaEventPlanner2026.xlsx

Parse the "FSV Comprehensive Portfolio" sheet (~30+ rows with start/end dates in 2026) and insert into `public.events` with:

- `name` ← Event
- `venue` ← Venue
- `city` ← Venue (also stored as city where no separate city)
- `start_date`, `end_date` ← Start/End
- `cost` ← Total Cost formatted as `$X,XXX` (attendance + flights + accommodation)
- `industry` ← Opportunity Area split into array
- `expected_audience` ← Strategic Value string
- `ai_score` ← Total Score (out of ~100) or Strategic Fit — will use Total Score
- `ai_summary` ← `"{Strategic Tier} — {Recommendation}. Strategic fit {n}/10."`
- `ai_factors` ← JSON of the individual sub-scores (Deal Flow, Investor Access, Strategic Partnerships, Government Access, Market Intelligence, Industry Insights, Brand Visibility, Learning, Long-Term Oppty, Cost)
- `status` ← lowercased Recommendation ("priority attend" → `priority`, "attend" → `attend`, "selective" → `selective`, "opportunistic" → `opportunistic`)
- `source_url` ← null (spreadsheet is internal)

Rows lacking scores (e.g. Annual Mining Conference, BioUK BioSeed, London Tech Week duplicate, SME Funding Summit) are still inserted with name/venue/dates only.

Insertion done through the Supabase insert tool as one bulk `INSERT ... VALUES (...)` statement. No schema changes required — existing columns cover everything.

## 2. Switch global font to Montserrat

- `src/routes/__root.tsx`: replace the Cormorant Garamond Google Fonts `<link>` with a Montserrat link (`family=Montserrat:wght@300;400;500;600;700`).
- `src/styles.css`: set both `--font-serif` and `--font-sans` to `"Montserrat", system-ui, sans-serif`. Keep the `.serif`/`font-serif` utility working by pointing it at Montserrat as well (so existing `font-serif` classes across pages still render, just in Montserrat). Slightly reduce heading letter-spacing tweak since Montserrat needs less negative tracking.
- Leave `components.json` and all component code unchanged — they only reference the CSS variables.

## Technical notes

- No new tables, no migration. Data-only insert + two file edits.
- Skipping the events table's `owner` field (not in spreadsheet).
- Duplicates in the sheet (two "London Tech Week" rows) will both be inserted; user can dedupe manually if desired.
