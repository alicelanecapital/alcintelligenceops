## Problem

Saving a scanned contact fails with:
> Could not find the 'company_description' column of 'contacts' in the schema cache

The `contacts` table has no `company_description` column, but the Add/Review Contact dialog writes to it.

## Fix

Add the missing column via a migration:

```sql
ALTER TABLE public.contacts ADD COLUMN company_description text;
```

No RLS/GRANT changes needed — existing policies on `public.contacts` already cover all columns.

## Files touched

- New migration only. No code changes; `src/lib/contacts.ts` and `contacts.index.tsx` already reference `company_description`.

## Verification

Re-open Scan business card → save. The row should insert without the schema-cache error, and the description entered in the dialog should persist on the contact.
