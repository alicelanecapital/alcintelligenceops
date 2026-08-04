# Playbook picker cleanup, DD → Deal, and sector-based Drive folders

## 1. Remove the sector entry from the Playbook dropdown

The Playbook dropdown (New meeting dialog and the picker at the top of the Live Workspace) currently lists a sector value such as "Retail" alongside the real playbooks. Playbooks are only the templates defined in Admin > Playbooks (Adhoc Meeting, Due Diligence, Front Door Questionnaire). The sector-derived option gets filtered out of both dropdowns so only real playbooks are selectable; sector stays where it belongs, on the contact/company record and the DD sector detection.

## 2. Selecting the DD playbook makes the meeting a Deal

When Due Diligence is chosen while starting a meeting, the record must land in the Deal Pipeline as a deal to run due diligence on:

- A deal record is created (or reused if one already exists for that contact/company) and linked to the meeting's workspace.
- The user is taken straight into the Deal Pipeline Room for round 1 rather than a private meeting workspace.
- Switching an existing meeting's playbook to Due Diligence in the Live Workspace does the same: it creates/links the deal and the meeting starts showing as a Deal Pipeline Room.
- Any meeting already started against the DD template but with no deal (KickFat is in this state) gets its deal created on next open, so it stops sitting outside the pipeline.

## 3. Google Drive: Sector folder, then company folder

Documents move to a two-level structure inside the shared Alice Lane folder:

```text
Shared folder
  Retail/
    KickFat/
      <files>
  Food/
    <company>/
```

- The sector folder comes from the company's sector (falling back to the contact's sector, then "Unclassified").
- Both folders are created on the first upload for that company and the company folder id is cached on the company record so it is only created once.
- The "Open Google Drive folder" button on a company/contact opens that company's own folder when it exists, otherwise the shared root.
- KickFat has no Drive folder yet because no document has been filed for it; the first DocBox upload will now create `Retail/KickFat`. If you want it created before any upload, say so and the folder will be created when the deal is opened instead.

## Technical notes

- `src/components/AddMeetingDialog.tsx` and `src/components/LiveWorkspace.tsx`: filter the playbook options to real toolkit rows only.
- DD routing: reuse `createOpportunityFromContact` in `src/lib/contacts.functions.ts` plus `resolveDealWorkspace` in `src/lib/deal-workspace.functions.ts` so both the dialog path and the in-workspace playbook switch converge on one deal per contact.
- `src/lib/docbox.server.ts`: `ensureCompanyFolder` gains a sector argument and resolves/creates the sector folder first, then the company folder under it; sector is read from `companies`/`contacts` in `fileDocument`.
- `src/lib/drive-folder.ts` keeps the shared root constant and the per-company URL helper.
