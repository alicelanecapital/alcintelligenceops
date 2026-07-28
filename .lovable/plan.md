## Contact page (`src/routes/contacts.$id.tsx`)

1. **Move Stakeholder Brief to the right rail.**
   - Remove the `brief` `AccordionItem` (Stakeholder Brief) from the left-column accordion in `OverviewTab`.
   - Add a new `<section>` in the right-hand `<aside>`, placed directly **under** "Opportunities in workflow" (before "AI summary"). Same baby-blue styling, title "Stakeholder Brief", with the existing regenerate button, summary / talking points / watch-outs, and the auto-generate-on-first-view effect.

2. **Reframe the Stakeholder Brief content itself.**
   - The brief must be **background intelligence about the stakeholder only** — who they are, career/background, reputation, network, communication style, prior ventures, public signals — with nothing about the upcoming engagement, meeting agenda, talking points, or watch-outs.
   - Update the AI prompt in `src/lib/contact-brief.functions.ts` (or the equivalent brief generator) to produce only background-intel fields; drop `talking_points` and `watch_outs` from the schema.
   - Update the render in the new right-rail section (and any other reader such as `OpportunityOverviewBar` / `SynopsisContent`) to show only the background fields — no talking-points / watch-outs blocks.

3. **Fix the top-right Start Meeting button.**
   - Currently the header button only calls `setActiveTab("live")`. Change it to kick off a meeting via `startMeetingForContact` (default playbook = DD Intelligence Engine, industry = contact's current industry) and navigate to `/interviews/$id`. If a `live` meeting already exists for this contact, navigate to it instead of creating a new one.

4. **Red Flags font size.**
   - In the Red Flags accordion body, drop the larger classes so entries render at the same `text-sm` / `text-xs` used by the sibling accordions.

## Contacts list (`src/routes/contacts.index.tsx`)

5. **Default the Group by control to no grouping.**
   - Set the initial value of the Group by Select to "None" so the list renders ungrouped on first load. Persist behaviour unchanged after the user picks another grouping.

## Interview workspace (`src/routes/interviews.$id.tsx`)

6. **Hide Pre-interview brief once the meeting is live.**
   - Only render `<TabsTrigger value="brief">` and its `<TabsContent>` when `iv.status !== "live"` and `iv.status !== "completed"`. If the user is on `brief` and status flips to `live`, switch `tab` to `live`.

7. **Rename the "draft" status badge to "Paused".**
   - Change `iv.status === "live" ? "draft" : iv.status` to render "Paused" instead of "draft". Keep the visual style.

8. **Replace the redundant sub-header line with an IC Report button.**
   - In `LiveView`, remove the `"{founder} · {business} · Elapsed …"` line above the `RoundStepper`.
   - In its place, right-align a Button labelled "IC Report" that switches the parent tab to `report` (lift the tab setter from `InterviewWorkspace` as a prop). Disabled until `iv.status === "completed"` or a `report` row exists (mirror the existing `TabsTrigger` disabled logic).
   - Keep the "Playbook / {name}" label on the left; the Elapsed timer stays inside the transcript card next to Start/Stop.

## Out of scope

- No other data-model changes, no styling changes outside the items above.

## Technical notes

- Files touched:
  - `src/routes/contacts.$id.tsx` — move Stakeholder Brief, rewire header Start Meeting, adjust Red Flags typography, drop engagement fields from the rendered brief.
  - `src/lib/contact-brief.functions.ts` — narrow prompt + output schema to background intelligence only.
  - `src/routes/contacts.index.tsx` — default Group by to "None".
  - `src/routes/interviews.$id.tsx` — conditional Pre-interview brief tab, "Paused" badge label, header row swap for IC Report button.
  - `src/components/OpportunityOverviewBar.tsx` and `src/components/SynopsisContent.tsx` if they still render `talking_points` / `watch_outs`.
- No new files, no migrations.
