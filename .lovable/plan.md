## Changes

### 1. Synopsis full-screen page — restore sections + keep tabs
`src/routes/opportunities.$id.synopsis.tsx` + `src/components/SynopsisContent.tsx`
- Add top `Tabs`: Sector, Stakeholder Brief, AI Overview, DISC, Red Flags.
- `SynopsisContent` gains optional `activeTab` prop; renders only that section when set, all sections when unset (PDF export path).

### 2. Events rows — white background
`src/routes/events.tsx`
- Row background → `bg-white`; keep forest-green dividers.

### 3. Contacts list — typography
`src/routes/contacts.index.tsx`
- Email + phone: bump one size (`text-xs` → `text-sm`).
- Ungrouped view: company name bold + one size larger.

### 4. Global light grey shading → `#EDEDED`
`src/styles.css`
- Update `--muted`, `--secondary`, `--record-surface` to oklch of `#EDEDED`.

### 5. DD Round Stepper
`src/components/RoundStepper.tsx`
- Remove outer container frame.
- Each round card: fine 1px hairline border (light grey) instead of the bold dark stroke. Active round keeps teal tint at same weight.

### 6. DD Interview layout
`src/routes/dd-interview.$opportunityId.$round.tsx`
- Shift heading + vertical step list further left.
- Add ~1.5 cm (`pl-16`) padding between vertical steps column and questions column.

### 7. Active nav item — forest green with white text
`src/components/AppShell.tsx`
- Selected sidebar menu item: `bg-forest text-white`; hover state adjusted for contrast.

### 8. Consistent primary action button style
`src/components/ui/button.tsx` + sweep of usages
- Standardize `variant="default"` to forest-green fill / white text / matching size + radius + icon spacing.
- Update Add Event, Add Round, Today, Add Contact, etc. to use this variant/size.

### 9. Remove Sub-calendars section from Accounts
`src/routes/admin.accounts.tsx`
- Delete the Sub-calendars UI block and its query/mutation wiring. Leave the underlying data untouched.

## Out of scope
No data model or business logic changes.