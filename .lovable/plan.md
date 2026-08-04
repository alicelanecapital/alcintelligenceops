# Fix: saving a contact fails on the Sector field

## What's wrong

The Add contact and Edit contact forms both have a **Sector** field, AI enrichment fills it in, and the contact detail page shows it as a badge — but the contacts table in the database has no place to store it. So every save fails with "Could not find the 'sector' column of 'contacts'", and nothing is saved (name, company, description and all).

Confirmed: `sector` is written on save from the add form and the edit dialog, is declared on the contact type, and is read on the contact detail page — but it does not exist as a column on the contacts table.

## The fix

Add a `Sector` field to the contacts record in the database so the existing forms save correctly.

- New optional text field `sector` on contacts (blank for existing contacts).
- No UI changes needed — the forms, the AI enrichment and the badge already expect it.
- After the change, saving a new contact (e.g. KickFat / Bonga with Sector "Retail") and editing an existing contact both persist the sector.

## Technical detail

Single migration:

```sql
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS sector text;
```

No grant or RLS change required — the column inherits the existing table-level grants and team-scoped policies. Types are regenerated after the migration; no code edits expected, and I'll re-typecheck to confirm.
