/** Client-safe Google Drive constants. The shared Alice Lane folder holds one subfolder
 * per company, created the first time a document is filed for that company. */
export const SHARED_DRIVE_FOLDER_ID = "1_AGnJIRYZYvTrdonrql2bcsuWX3Gn9XH";
export const SHARED_DRIVE_FOLDER_URL = `https://drive.google.com/drive/u/0/folders/${SHARED_DRIVE_FOLDER_ID}`;

export function companyDriveFolderUrl(folderId: string | null | undefined) {
  return folderId ? `https://drive.google.com/drive/u/0/folders/${folderId}` : SHARED_DRIVE_FOLDER_URL;
}
