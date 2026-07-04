## Problem

Production preview shows "preview has not been built" because the build's typecheck fails with 4 TypeScript errors in `src/routes/ecosystem.tsx`. The generated Supabase `types.ts` doesn't include the `call_status` column on `contacts`, but the code references it (lines 92, 94, 95).

Dev server, env vars, and routing are all fine — only the strict build is blocked.

## Fix

In `src/routes/ecosystem.tsx`, cast the contact rows to `any` at the render boundary (same workaround already applied in `opportunities.index.tsx` for stale generated types), so `c.call_status` typechecks:

```ts
const contacts = (contactsQuery.data ?? []) as any[];
```

That single change resolves all 4 errors and unblocks the build.

## Verification

Run `bunx tsgo --noEmit` — expect 0 errors — then the preview will build.