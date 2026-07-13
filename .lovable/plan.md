## 1. Auto-fill Name from Company (not just placeholder)

In the Review-scanned-contact dialog and Add Contact dialog, the Name field currently only *shows* "Defaults to company if blank" as placeholder — the field stays empty until save. Change it so:

- When Company is filled (via scan pre-fill or manual `onBlur`) and Name is still empty, set `form.name = form.company` in state immediately so the user sees "Wellness Corporate" in Name and can edit it.
- Same behavior in `EditContactDialog` when Company changes and Name is blank.
- Keep the existing save-time fallback as a safety net.

## 2. Inline "Add new event" in the Source event dropdown

Replace the plain `<select>` for Source event in `AddContactDialog`, `EditContactDialog`, and the business-card scan review step with a small combobox:

- Options = alphabetically sorted existing events + sticky "+ Add new event…" item at the bottom.
- Selecting it opens a lightweight inline prompt (Name + optional Date) that calls a `createEvent` server function (or existing helper in `src/lib/db.ts` — confirm during build).
- On success: invalidate `["events"]`, auto-select the new event; the sorted render places it in the correct position automatically.
- Store the selected event id in the sticky localStorage key.

## 3. Friendly delete confirmation (replace native `confirm()`)

The "Alice Lane" screenshot is the browser's native `window.confirm("Delete Christiaan?")` from the trash icon. Replace with shadcn `AlertDialog`:

- Title: "Delete contact?"
- Description: "This will permanently delete **{name}** and cannot be undone. Related meetings, opportunities and event attendance will keep their history but lose the link to this contact."
- Buttons: "Cancel" (outline), "Delete" (destructive).
- Wire up in both `contacts.index.tsx` (list + card views) and `contacts.$id.tsx` (detail). Single local `contactToDelete` state so only one dialog instance mounts.

## 4. Swap Company and Name field order

In every contact surface, put **Company first, then Name**:

- `contacts.$id.tsx` — detail/view page: reorder the header and the field grid so Company is shown/read first.
- `EditContactDialog.tsx` — reorder the grid so Company row is above Name.
- `AddContactDialog` in `contacts.index.tsx` — same reorder.
- Business-card scan review dialog — same reorder in the review form.

This is a pure presentation swap: no state key renames, no data migration, no label changes. Behavior 1 (name auto-fills from company) still applies — now the flow reads naturally top-to-bottom: type Company → Name auto-populates below.

## Files to touch

- `src/routes/contacts.index.tsx`
- `src/routes/contacts.$id.tsx`
- `src/components/EditContactDialog.tsx`
- Business-card scan dialog component (confirm exact filename during build)
- `src/lib/contacts.functions.ts` or `src/lib/db.ts` — add `createEvent` if not already exposed.

## Out of scope

- No schema changes, no new packages.
- No changes to merge-duplicates or AI description behavior.
