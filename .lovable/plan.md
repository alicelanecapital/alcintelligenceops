## Contacts – capture, edit, dedupe & QR scanning

### 1. Edit Contact parity with Add / Scan
Add the missing fields to `EditContactDialog` in `src/routes/contacts.$id.tsx` so it mirrors `AddContactDialog`:
- Source event (dropdown of events, sorted alphabetically)
- Date met
- Company description (with "Generate with AI" button)
- Persist via `updateContact` (already accepts these columns)

### 2. Alphabetical Source Events
Sort the events list A→Z in both dialogs (Add Contact, Review Scanned Contact, Edit Contact) — do the sort in the component after `fetchEvents`.

### 3. Default Name = Company when blank
In `AddContactDialog` save handler: if `form.name` is empty, use `form.company` as the name before insert. Also relax the "Save disabled unless name" gate so the button enables when either name or company is filled.

### 4. Remember last event + date for scans
Persist the last-used `source_event_id` and `date_met` to `localStorage` (`contacts:last_source_event_id`, `contacts:last_date_met`) whenever a contact is saved. `AddContactDialog` (both plain and Review Scanned) prefills from these values, so consecutive scans at the same event auto-fill until the user changes it manually.

### 5. Remove duplicate contacts
- Add a one-off "Merge duplicates" action on `/contacts` (button next to Add contact, opens a small dialog listing groups).
- Duplicate rule: same normalized email OR (same normalized phone) OR (same lowercase name + same lowercase company).
- For each group, keep the oldest record, merge non-null fields from the others into it, reassign FKs on `interviews`, `opportunities`, `meetings`, `communications`, `notes`, `tasks`, `document_requests` from duplicate ids → kept id, then delete the duplicates. Implemented as a `createServerFn` (`mergeDuplicateContacts`) using `requireSupabaseAuth`.
- Show a preview count first ("Found N duplicate groups, M contacts will be merged") and require a confirm click.

### 6. Scan QR code on contacts
Extend `ScanBusinessCardDialog` (rename UI to "Scan card / QR"):
- Add `jsqr` (pure JS QR decoder, edge-safe, client-only).
- On "Use this photo" and during live camera preview, run `jsQR` on the frame first.
- If a QR is detected, parse it:
  - `BEGIN:VCARD` → map FN/ORG/TITLE/EMAIL/TEL/URL/X-SOCIALPROFILE to form fields, skip AI call.
  - `MECARD:` → same mapping.
  - Plain URL / email / phone → prefill the matching field only.
  - Otherwise dump into notes.
- If no QR found, fall back to existing AI business-card extraction.
- Prefill flows into the same Review Scanned Contact dialog, which now also inherits the remembered event/date.

### Technical notes
- Files touched:
  - `src/routes/contacts.index.tsx` — sort events, localStorage prefill, name-fallback, QR path, Merge button.
  - `src/routes/contacts.$id.tsx` — expand `EditContactDialog` fields + generate-description.
  - `src/lib/contacts.functions.ts` — add `mergeDuplicateContacts` server fn.
  - `src/lib/qr.ts` (new) — thin wrapper around `jsqr` + vCard/MECARD parser.
  - `package.json` — add `jsqr`.
- No schema changes needed; `contacts.company_description`, `source_event_id`, `date_met` already exist.
- The merge server fn runs as the signed-in user (RLS applies). No admin client.

### Out of scope
- Automatic de-dup on insert (this plan only ships the manual merge action).
- Background/periodic dedupe.