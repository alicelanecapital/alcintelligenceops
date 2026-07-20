## DD Framework Admin – layout polish

Edit `src/routes/admin.dd-framework.tsx` only.

### Round row (collapsed)
- Place the accordion chevron on the far left of the row (standard accordion behavior — chevron toggles expand/collapse, positioned before all other row content).
- Order left → right: chevron → drag handle → number badge → title/subtitle.
- Remove the border/rounded frame around each `AccordionItem`; separate rounds with a thin grey divider (`border-b border-border`) only.
- Remove the muted background (`bg-muted/30`) from the row header.
- Hide the trash/delete button when the round is collapsed; show it only when the round is expanded, aligned to the far right inside `AccordionContent` (top-right of the expanded body).

### Round body (expanded)
- Between "Round details", "Questions", and "Required documents" sections, use a plain grey horizontal divider (`border-t border-border my-6`) instead of the current section bottom-border pattern.
- Keep existing content, spacing, and section headings unchanged otherwise.

### Out of scope
- No changes to data, server functions, drag-reorder behavior, or other routes.
