## Contacts – auto-AI description, smarter dedupe, inline CRUD, sticky event

### 1. Auto-generate AI Company Description (no button click)
In `AddContactDialog` and `EditContactDialog`:
- When the Company field loses focus (`onBlur`) and `company_description` is empty and company has ≥2 chars, kick off `generateCompanyDescription` automatically.
- Show a small "Generating with AI…" hint under the textarea while it runs; user can still edit or overwrite.
- Debounce so re-blurring the same company doesn't refetch. Keep the manual "Generate with AI" button as a re-run option.

### 2. Merge Duplicates – detect by same email OR same phone (regardless of name)
Current rule in `contacts.functions.ts` already unions same-email, same-phone, and same-(name+company). Tighten and surface it:
- Normalize phones more loosely: strip everything non-digit, then compare last 9 digits (so `+27 82 555 1234` and `082 555 1234` match).
- Normalize emails to lowercase trimmed (already done) and also ignore `+tag` in local part (`jane+work@x.com` = `jane@x.com`).
- In the Merge dialog, group each duplicate under its match reason ("Same email", "Same phone", "Same name + company") so the user can see why.
- Add per-group checkboxes so the user can opt out of specific merges before confirming (send selected `keepId → [dupeIds]` map to `mergeDuplicateContacts`).

### 3. Full CRUD on each record
- **Create**: exists (Add contact).
- **Read**: exists (list + detail).
- **Update**: exists on detail page. Add inline quick actions on each list/card row: a pencil (opens `EditContactDialog` reused from detail) and trash (with confirm) — no need to navigate into detail for small fixes.
- **Delete**: already on detail; add to list row as above.
- Extract `EditContactDialog` from `contacts.$id.tsx` into `src/components/EditContactDialog.tsx` so both list and detail can mount it.

### 4. Sticky Event + Event Date until manually changed
Current implementation writes `contacts:last_source_event_id` / `contacts:last_date_met` only on successful save. Change to sticky-by-intent:
- Write to localStorage as soon as the user picks/changes the event or date in the dialog (not just on save), so an abandoned dialog still remembers.
- Also apply the sticky values inside the scan → Review Scanned Contact flow (already prefills, but confirm QR/AI scans don't overwrite them with `null`).
- Add a small "Sticky · click to clear" chip next to Source event and Date met that shows the remembered value and clears both keys on click.

### Technical notes
Files touched:
- `src/routes/contacts.index.tsx` — auto-description on blur, sticky-write on change, sticky chip, list-row edit/delete buttons, mount shared EditContactDialog, richer merge dialog (reasons + checkboxes).
- `src/routes/contacts.$id.tsx` — replace inline EditContactDialog with shared import; add auto-description on blur.
- `src/components/EditContactDialog.tsx` (new) — extracted dialog with all fields + auto AI description.
- `src/lib/contacts.functions.ts` — looser phone/email normalization, return `reason` per group from `previewDuplicateContacts`, accept an optional `selection: { keepId: string; dupeIds: string[] }[]` on `mergeDuplicateContacts` (falls back to merging all when omitted).

No schema changes. No new packages.

### Out of scope
- Auto-dedupe on insert.
- Fuzzy name matching (Levenshtein) — only exact normalized matches.
- Undo after merge.
