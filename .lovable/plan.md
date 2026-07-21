# Make Round titles in the Stepper bold forest green

## What to change
In `src/components/RoundStepper.tsx`, the round title currently renders as normal-weight text. Update it so the entire title (not just the "Round N:" prefix) is displayed in **bold** and **forest green** (`text-green-800` or the project's forest-green token).

## Why
The user previously asked for the "Round N:" prefix to be bold forest green; they now want the whole round title styled the same way for visual consistency.

## Implementation
- Locate the element that renders the round title inside `RoundStepper.tsx`.
- Add `font-bold text-green-800` (or equivalent forest-green class) to that element.
- Ensure the existing prefix-split logic (if any) still works; if the title is split into prefix + remainder, apply the classes to the wrapping element so the whole line is bold forest green.
- Keep other stepper layout/spacing changes intact.

## Verification
- Open a page that renders the DD stepper (e.g. `/dd-interview/...`) and confirm every round heading is bold and forest green.
- Check that active/inactive round titles both use the new style, or that active state only adds an accent without removing the color/bold.

No database or server changes required.