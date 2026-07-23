## Live Workspace — grouping, dedup, typography, and layout

All edits in `src/routes/interviews.$id.tsx`. No unique content is dropped — items are wrapped in accordions where noted; duplicates and near-duplicates are collapsed.

### 1. Layout — 4-column grid
Change the workspace to a 4-column grid (`grid-cols-12`, each column = 3 spans):

```
┌──────────────┬──────────────────────────────┬──────────────┐
│  Col 1 (3)   │       Cols 2–3 (6)           │  Col 4 (3)   │
│  Left rail   │  Live Transcript (top)       │  Risk Alerts │
│  (existing)  │  Live Scoring   (below,      │  (top)       │
│              │   spans same 2 cols, NOT     │  then the    │
│              │   an accordion — inline)     │  remaining   │
│              │                              │  right-rail  │
│              │                              │  cards       │
└──────────────┴──────────────────────────────┴──────────────┘
```

- Live Transcript keeps its single-session accordion (forest green pill trigger).
- Live Scoring sits directly under Live Transcript in the same 2-column band and is rendered inline (no accordion wrapper), showing all metric rows expanded.
- Right column (col 4) leads with Risk Alerts at the very top, then the remaining right-rail cards (Suggested Follow-ups, Missing Evidence, Contradictions, Document Requests) below it in their existing order.

### 2. Risk alerts — grouped by risk type (accordion, collapsed)
- Body is an `Accordion type="multiple"` collapsed by default.
- Dedup risks first (see §6), then group by `payload.category` (fallback `"Uncategorised"`).
- Trigger: category + count + average rating badge (right). Average = mean of numeric ratings; label ratings (Low/Medium/High/Critical) mapped to 1/2/3/4, averaged, mapped back. Colour via existing `ratingColor()`.
- Expanded content: current per-item render unchanged.

### 3. Live scoring — inline, colour-coded (no accordion)
- Render all metric rows directly (no wrapper accordion).
- Keep the per-badge colouring: <5 red, 5–7 amber, ≥8 green; add string mapping for "Very low"/"Low" → red, "Medium" → amber, "High" → green.

### 4. Suggested follow-ups — dedup + single collapsed accordion
- Whole card body becomes one collapsed accordion item; trigger shows count.
- Dedup rules per §6. Kept rows preserve question + why + alternative verbatim.

### 5. Missing evidence, Contradictions, Document requests — collapsed accordions
- Each becomes a single collapsed accordion item; trigger = existing title + count.
- Expanded content unchanged.

### 6. Typography bump — 8px → 9px
- In this file, replace every `text-[8px]` → `text-[9px]`. If none exist at that exact class, bump the smallest tracking labels currently rendered at ~8px to `text-[9px]`, verified during implementation.

### 7. Cross-frame duplicate & duplicated-meaning removal
Applies inside each frame AND across frames — Risk Alerts, Contradictions, Missing Evidence, Suggested Follow-ups, Document Requests.

Normalisation for every comparison:
```
norm(s) = s.toLowerCase()
          .replace(/[^a-z0-9 ]+/g, " ")
          .replace(/\s+/g, " ")
          .trim()
```

Signatures:
- Risk: `norm(category) + "|" + norm(reason)`
- Contradiction: sorted pair `[norm(a), norm(b)]` joined `"|"` + `norm(reason)`
- Missing evidence: `norm(topic)` (fallback `norm(why)`)
- Follow-up: `norm(question)`
- Document request: `norm(doc_type)`

Exact-signature dedup: keep first occurrence per list.

Near-duplicate dedup: Jaccard similarity of word-token sets ≥ 0.8 on the primary field → collapse. Keep earlier item; if the later item has a longer `reason`/`why`/`alternative`, merge that longer text into the kept item so no detail is lost.

Cross-frame precedence (removes the weaker echo; the winning frame keeps full text):
1. Contradictions win over Risk Alerts.
2. Risk Alerts win over Missing Evidence.
3. Missing Evidence wins over Document Requests when doc_type norm matches a missing topic.
4. Follow-ups deduped against Missing Evidence: follow-up whose norm token-contains a missing-evidence topic is removed.

All dedup is in-memory before render; no DB writes. Empty frames still render their existing italic empty state inside the accordion.

### Notes
- No schema changes, no server-function changes, no other routes touched.
- All new accordions use `type="multiple"` with `value={[]}` initial — collapsed on load, independently expandable.
