# Restore DocBox access to the existing shared Drive folder

## Confirmed diagnosis

The Google Drive connector itself is healthy and authenticated as `georgia@alicelanecapital.com`. The Drive API returns `404 File not found` for the configured Alice Lane shared-folder ID, and a Drive-wide search from that account cannot see the folder. The existing folder therefore has not been shared with this connected account, or the account lacks sufficient access to it.

## Plan

1. **Restore folder access**
   - Keep the existing Alice Lane shared folder and its `Shared / Sector / Company` hierarchy.
   - Grant `georgia@alicelanecapital.com` Editor access to that folder in Google Drive, including access inherited by its contents.
   - Re-test the exact configured folder ID through the connected account before attempting document uploads.

2. **Harden shared-folder API calls**
   - Add Google Drive shared-drive parameters where supported (`supportsAllDrives` and `includeItemsFromAllDrives`) to folder lookup, creation, and upload requests.
   - Validate the configured root folder directly before searching for or creating sector/company folders.
   - Never create a replacement root folder when the configured existing folder is inaccessible.

3. **Make failures actionable in DocBox**
   - Preserve the provider status and response message from failed folder searches, folder creation, and uploads.
   - Show a specific message when the connected account cannot access the configured folder, identifying the account that needs folder access.
   - Keep documents safely stored in DocBox when Drive sync fails, with the **Sync Drive** action available for retry after access is granted.

4. **Backfill and verify**
   - Run the pending-document sync after folder access is restored.
   - Confirm the KickFat documents receive Drive file IDs and appear under the existing `Shared / Retail / KickFat` folder.
   - Verify both a new upload and a retry of an existing unsynced document from the Live Workspace.

## User action required

In Google Drive, share the existing configured Alice Lane folder with `georgia@alicelanecapital.com` as **Editor**. Reconnecting OAuth alone will not make a private folder visible unless this account is granted access.

## Technical scope

Changes will be limited to the DocBox Drive server integration and its existing sync feedback. No document records will be deleted or moved to a new root folder.