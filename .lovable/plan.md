## Additions to the current plan

### 5. Restore David Davies meeting

Both David Davies / Izenzo interview rows (`dba5cf2c…` and `5eab6030…`) are currently `hidden = true`, which is why they no longer appear in Engagements — the live workspace data itself was not deleted. Set `hidden = false` on both rows via a data update so the meetings reappear in the Engagements list and their Live Workspace is reachable again.

### 6. Remove the "dismiss / hide" capability from Engagements

Since we already agreed meetings should never be dismissed, also remove any remaining code path that sets `interviews.hidden = true`:

- `src/lib/founders-data.ts` (or wherever `dismissInterview` lives) — drop the mutation.
- `src/routes/interviews.index.tsx` — remove the `dismissMut` wiring and any dismiss trigger so no future meeting can be hidden.
- Continue to filter `hidden = false` in list queries so any legacy hidden rows (none after step 5) still respect the flag.
