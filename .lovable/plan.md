## Accounts row tidy-up (`src/routes/admin.accounts.tsx`)

### 1. Connection details on separate rows
Today the meta line under each account name is one long string: email · Connected date · Last synced date/time.

Change to stacked lines under the account label:
- Line 1: the email address (when a display name is shown)
- Line 2: `Connected 13 Jul 2026` (or `Not connected yet`)
- Line 3: `Last synced 29 Jul 2026, 14:32` (or `Never synced`)

Same small muted text size, no truncation of the dates.

### 2. Colour dropdown shows swatches only
Replace the native `<select>` listing colour names with a compact swatch picker:
- Trigger shows just the colour dot (no text), narrow fixed width
- Opening it shows a small grid of colour dots; clicking one saves immediately (same `updateColorMut` call)
- Each dot carries the colour name as a tooltip/`title` for accessibility

The freed horizontal space goes back to the name/email column, so the row grid widths are adjusted accordingly.

No backend or data changes.
