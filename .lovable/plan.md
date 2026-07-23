## Rename Intelligence Toolkits → Playbooks

Pure UI/label rename. No schema, route, or business-logic changes. The existing `/admin/dd-framework` route is added as its own nav link.

### 1. Nav (`src/components/AppShell.tsx`)
Under Admin, replace the single "Intelligence Toolkits" item with two entries (order):
- `/admin/toolkits` → **Playbooks** (existing icon)
- `/admin/dd-framework` → **DD Intelligence Engine** (icon: `Brain` or existing `ShieldCheck` variant)

### 2. Playbooks index (`src/routes/admin.toolkits.index.tsx`)
- Page title/eyebrow: "Playbooks" (was "Intelligence Toolkits").
- Description mentions playbooks instead of toolkits.
- Head meta title: "Playbooks · Alice Lane".
- Button labels: "New playbook" / "Create playbook" / "Edit playbook" / "Delete this playbook?".
- Empty state: "No playbooks yet".
- Toast messages: "Playbook created/updated/deleted".
- The DD row: rename displayed name from "DD Intelligence Engine" to **"DD Intelligence Engine (Playbook Template)"** (label only; the underlying seeded toolkit row keeps its id, so the `isDD` check by name still routes to `/admin/dd-framework`). Update that name check to match the new label.

### 3. Playbook designer (`src/routes/admin.toolkits.$id.tsx`)
- Eyebrow "Admin · Playbook", back-link text "All playbooks", head meta "Playbook designer · Alice Lane", inline copy about "custom playbooks".

### 4. Not touched
- Table name `toolkits`, function names in `src/lib/toolkits.ts`, route paths (`/admin/toolkits`), query keys — internal only.
- DD Intelligence Engine functionality at `/admin/dd-framework` — unchanged, just now reachable directly from Admin nav.

### Files edited
- `src/components/AppShell.tsx`
- `src/routes/admin.toolkits.index.tsx`
- `src/routes/admin.toolkits.$id.tsx`
