## UI Polish & Meetings/Deals Refinements

### Meetings screen
- Add a **Start** button on every row in **Client Meetings** and **Private Meetings** (reuses the existing start-meeting handler / navigates to the meeting detail route).
- Remove the outer bordered frame around Client Meetings and Private Meetings cards.

### Deal Pipeline (`src/routes/deals.tsx`)
- Compact each deal card frame to **~1/3 of current height** (tighter padding, condensed rows).
- Reduce **Company name** font size by **2pt**.

### Calendar (`src/routes/calendar.tsx`)
- Make the calendar **taller overall** by increasing each week row's height — still show **only the current month's weeks** (no extra week added).
- Weekday **DAYS** header row: forest-green background, white font.
- Day numbers in forest green.
- Grid lines a **darker grey**.

### Current Events (`src/routes/events.tsx`)
- Remove outer border/frame around the list.
- Keep forest-green row dividers.

### Contacts (`src/routes/contacts.index.tsx`)
- Remove outer frame around the contacts list.
- Reduce contact name and company name by **1pt**.
- Keep alphabet chips as-is (forest green).
- Rename **"Merge Duplicates"** → **"Deduplicate"**.

### Booking link (`src/routes/book.$slug.tsx` + link generator)
- Make the shared booking URL more user-friendly: swap the current slug for a short, readable path (e.g. `/book/tendai-alice-lane`) and prettier on-page copy.

### App shell / global (`src/components/AppShell.tsx`, `src/styles.css`)
- Remove divider line under the top-left logo.
- Align the Overview heading + nav menu with the top of the "Active Deals" / infographic frame.
- Nav section labels (**Overview**, **CRM**, **Due Diligence Engine**, **Admin**) and small eyebrow headings above screen titles (e.g. "Relationships") in **forest grey**.
- Screen-heading underlines stay forest green.
- Record/list item frames across the app use a **dark grey** background.

### Tokens
- Add `--forest-grey`, `--record-surface`, `--calendar-grid` in `src/styles.css` so these stay themable.

---

### Answer to your earlier question — where's "Chimanimani" coming from?
It's an all-day event on **8 Aug 2026** on the **info@alicelanecapital.com** Google calendar, also visible on Georgia's account because that shared calendar is attached there.
