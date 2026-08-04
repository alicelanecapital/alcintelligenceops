# Recover the KickFat DocBox documents

## What happened

Your files are not lost. They are all still stored, but attached to the *first* KickFat workspace, not the one you are looking at now.

There are two KickFat meeting records for Bonga:

```text
Bonga · KickFat        (created 15:50)  <- your 17 documents live here
KickFat · Due Diligence (created 16:04) <- the Deal workspace you have open now, DocBox empty
```

When the Due Diligence playbook turned KickFat into a Deal, a second workspace record was created and linked to the deal. DocBox lists documents strictly by workspace record, so the new one shows nothing.

Separately, none of the 17 documents has a Google Drive file ID — the Drive sync did not run for any of them, so nothing was written into a `Shared / Retail / KickFat` folder either.

## Fix

1. **Re-point the documents** — move the 17 KickFat documents from the old workspace record onto the current Deal workspace record, so they appear in the DocBox you have open (round columns stay as classified).
2. **Retire the duplicate** — merge the older `Bonga · KickFat` record into the Deal workspace (transcript, notes, analyses) and remove the leftover duplicate so KickFat has one workspace only.
3. **Make DocBox company-scoped, not workspace-scoped** — list documents by company (falling back to the workspace record when there is no company), so this can never happen again if another workspace record is created for the same company.
4. **Fix Drive sync** — diagnose why the uploads never reached Google Drive, then back-fill the 17 existing files into `Shared / Retail / KickFat` and confirm new uploads land there.

## Technical notes

- Data: `public.workspace_documents` rows with `interview_id = 085c7b63…` get re-pointed to `42045dc5…`; `company_id` is already set to the KickFat company on every row, so company-scoped listing works immediately.
- `src/lib/workspace-documents.ts` already has `listCompanyWorkspaceDocuments`; switch `DocBox` to use it keyed off the workspace's company, keeping interview-scoped listing as fallback.
- Add a guard so opening a DD deal workspace reuses the existing live/draft interview for the contact instead of creating a second one.
- Drive: check `src/lib/docbox.server.ts` `ensureCompanyFolder` / upload path for silent failures (missing token, sector lookup) and surface errors in the UI instead of failing quietly.
